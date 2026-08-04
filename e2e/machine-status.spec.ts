import { expect, test } from "@playwright/test";
import {
  addFault,
  addMaintenanceLog,
  createClub,
  createMachine,
  machineStatus,
  sql,
  userIdByEmail,
} from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Maschinen-Betriebsstatus (Dashboard, hybrid): normalerweise aus den offenen
  Fehlern abgeleitet (offener kritischer Fehler → „Eingeschränkt"), manuell
  übersteuerbar (pinnt den Status). Dazu: Fehler-Vorschau mit Melder-Name +
  „Letzte Wartung" auf der Übersicht.
*/
test.describe("Maschinen-Status (Dashboard)", () => {
  let machineId: string;
  let clubMachineId: string;
  let clubId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    ({ machineId } = await createMachine({ ownerId, opdbRef: "E2E9-STAT" }));
    // Club-Maschine, damit der Supporter (nur Lesen) sie einsehen kann.
    clubId = await createClub("E2E Statusclub", ownerId);
    ({ machineId: clubMachineId } = await createMachine({
      ownerId,
      clubId,
      opdbRef: "E2E9-STAT2",
    }));
  });

  test.afterAll(async () => {
    await sql`DELETE FROM machines WHERE id IN (${machineId}, ${clubMachineId})`;
    await sql`DELETE FROM clubs WHERE id = ${clubId}`;
  });

  test("kritischer Fehler (über die Oberfläche) setzt den Status auf Eingeschränkt", async ({
    page,
  }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}/faults/new`);
    await page.getByLabel("Beschreibung / Symptom").fill("E2E Rechter Flipper tot");
    await page.getByLabel("Priorität").selectOption("kritisch");
    await page.getByRole("button", { name: "Speichern" }).click();
    await page.waitForURL((u) => u.pathname === `/machines/${machineId}`);

    expect((await machineStatus(machineId)).status).toBe("eingeschraenkt");
    await expect(page.getByText("Eingeschränkt").first()).toBeVisible();
  });

  test("Fehler beheben setzt den Status zurück auf Spielbereit", async ({
    page,
  }) => {
    // Den offenen kritischen Fehler finden und über die Oberfläche beheben.
    const [f] = await sql`
      SELECT id FROM faults WHERE machine_id = ${machineId}
      AND prioritaet = 'kritisch' AND status != 'behoben' LIMIT 1`;
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}/faults/${f.id}/edit`);
    await page.getByLabel("Status").selectOption("behoben");
    await page.getByRole("button", { name: "Speichern" }).click();
    await page.waitForURL((u) => u.pathname === `/machines/${machineId}`);

    expect((await machineStatus(machineId)).status).toBe("spielbereit");
  });

  test("manueller Status pinnt und übersteuert die Automatik", async ({
    page,
  }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}?bereich=uebersicht`);
    await page.getByRole("button", { name: "Status manuell setzen" }).click();
    await page.getByLabel("Status").selectOption("ausser_betrieb");
    await page.getByLabel("Begründung (optional)").fill("E2E: Netzteil defekt");
    await page.getByRole("button", { name: "Status setzen" }).click();
    await expect(page.getByText("Außer Betrieb").first()).toBeVisible();

    const s = await machineStatus(machineId);
    expect(s.status).toBe("ausser_betrieb");
    expect(s.manuell).toBe(true);

    // Ein neuer kritischer Fehler (direkt) + Automatik-Trigger über die Oberfläche
    // darf den gepinnten Status NICHT ändern.
    await addFault({ machineId, prioritaet: "kritisch", status: "offen" });
    await page.goto(`/machines/${machineId}/faults/new`);
    await page.getByLabel("Beschreibung / Symptom").fill("E2E weiterer Fehler");
    await page.getByRole("button", { name: "Speichern" }).click();
    await page.waitForURL((u) => u.pathname === `/machines/${machineId}`);
    expect((await machineStatus(machineId)).status).toBe("ausser_betrieb");
  });

  test("Zurück auf Automatik rechnet aus den offenen Fehlern neu", async ({
    page,
  }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}?bereich=uebersicht`);
    await page.getByRole("button", { name: "Zurück auf Automatik" }).click();
    await expect(page.getByText("Eingeschränkt").first()).toBeVisible();

    const s = await machineStatus(machineId);
    expect(s.manuell).toBe(false);
    expect(s.status).toBe("eingeschraenkt"); // der kritische Fehler ist noch offen
  });

  test("Supporter (nur Lesen) sieht keine Status-Steuerung", async ({ page }) => {
    await loginAs(page, USERS.supporter);
    await page.goto(`/machines/${clubMachineId}?bereich=uebersicht`);
    await expect(page.getByText("Maschinenstatus")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Status manuell setzen" }),
    ).toHaveCount(0);
  });

  test("Fehler-Vorschau zeigt den Melder-Namen; Letzte Wartung erscheint", async ({
    page,
  }) => {
    const memberId = await userIdByEmail(USERS.member);
    await addFault({
      machineId: clubMachineId,
      beschreibung: "E2E Vorschau-Fehler",
      prioritaet: "hoch",
      status: "offen",
      gemeldetVon: memberId,
    });
    await addMaintenanceLog(clubMachineId);

    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${clubMachineId}?bereich=uebersicht`);
    const vorschau = page.getByRole("cell", { name: "E2E Vorschau-Fehler" });
    await expect(vorschau).toBeVisible();
    const memberName = (
      await sql`SELECT name FROM "user" WHERE id = ${memberId}`
    )[0].name as string;
    await expect(page.getByRole("cell", { name: memberName })).toBeVisible();
    await expect(page.getByText("Letzte Wartung")).toBeVisible();
    await expect(page.getByText("heute")).toBeVisible();
  });

  test("Übersicht listet nicht spielbereite Maschinen", async ({ page }) => {
    // machineId steht nach den obigen Tests auf „eingeschraenkt".
    expect((await machineStatus(machineId)).status).toBe("eingeschraenkt");
    await loginAs(page, USERS.owner);
    await page.goto("/dashboard");
    const sektion = page
      .locator("section#status")
      .filter({ hasText: "Nicht spielbereite Maschinen" });
    await expect(sektion).toBeVisible();
    await expect(sektion.getByText("Eingeschränkt").first()).toBeVisible();
  });
});
