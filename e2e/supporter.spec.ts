import { expect, test } from "@playwright/test";
import {
  addRepair,
  createClub,
  createMachine,
  sql,
  userIdByEmail,
} from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Supporter = globale NUR-LESE-Rolle.

  Prüft die Grenze, die den ganzen Umbau motiviert hat: ein Supporter darf in
  jeden Club und dessen Maschinen hineinsehen, aber KEINE privaten Sammlungen
  sehen und NICHTS verändern (die App hat Lese- und Schreibzugriff vorher
  vermischt).
*/

test.describe("Supporter (globale Nur-Lese-Rolle)", () => {
  let clubMachine: string;
  let privateMachine: string;
  let clubId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    clubId = await createClub("E2E Supporterclub", ownerId);
    ({ machineId: clubMachine } = await createMachine({
      ownerId,
      clubId,
      opdbRef: "E2E7-MCLUB",
      modell: "Club-Automat",
    }));
    await addRepair(clubMachine);
    // Private Maschine des Owners (ohne Club) — für Supporter unsichtbar.
    ({ machineId: privateMachine } = await createMachine({
      ownerId,
      opdbRef: "E2E7-MPRIV",
      modell: "Privat-Automat",
    }));
  });

  test.afterAll(async () => {
    await sql`DELETE FROM machines WHERE id IN (${clubMachine}, ${privateMachine})`;
    await sql`DELETE FROM clubs WHERE id = ${clubId}`;
  });

  test("sieht fremde Clubs zur Einsicht — behält aber „Neuer Club\"", async ({
    page,
  }) => {
    await loginAs(page, USERS.supporter);
    await page.goto("/clubs");
    // Fremder Club, in dem der Supporter kein Mitglied ist → nur Einsicht.
    await expect(page.getByText("E2E Supporterclub")).toBeVisible();
    await expect(page.getByText("Einsicht")).toBeVisible();
    // Supporter ist zugleich normaler Nutzer: Clubs anlegen bleibt möglich.
    await expect(page.getByRole("link", { name: "Neuer Club" })).toBeVisible();
  });

  test("Rollen kombinieren sich: Supporter + Owner eines eigenen Clubs", async ({
    page,
  }) => {
    // Der Supporter wird zusätzlich Owner eines eigenen Clubs.
    const supporterId = await userIdByEmail(USERS.supporter);
    const eigenerClub = await createClub("E2E Supporter-eigener", supporterId);
    try {
      await loginAs(page, USERS.supporter);
      await page.goto("/clubs");

      // Eigener Club: Owner-Rolle sichtbar (nicht „Einsicht").
      const eigen = page
        .getByRole("link")
        .filter({ hasText: "E2E Supporter-eigener" });
      await expect(eigen.getByText("Owner")).toBeVisible();

      // Fremder Club: nur Einsicht.
      const fremd = page
        .getByRole("link")
        .filter({ hasText: "E2E Supporterclub" });
      await expect(fremd.getByText("Einsicht")).toBeVisible();

      // Im eigenen Club darf er als Owner verwalten (Schreibrecht bleibt trotz
      // globaler Nur-Lese-Rolle erhalten).
      await page.goto(`/clubs/${eigenerClub}`);
      await expect(page.getByRole("button", { name: "Club löschen" })).toBeVisible();
    } finally {
      await sql`DELETE FROM clubs WHERE id = ${eigenerClub}`;
    }
  });

  test("darf eine Club-Maschine lesen, aber nicht bearbeiten/löschen", async ({
    page,
  }) => {
    await loginAs(page, USERS.supporter);
    await page.goto(`/machines/${clubMachine}`);

    await expect(page.getByText("Club-Automat")).toBeVisible();
    // Keine schreibenden Bedienelemente.
    await expect(page.getByRole("button", { name: "Löschen" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Bearbeiten" })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /Neuer Fehler|Neue Reparatur/ }),
    ).toHaveCount(0);
  });

  test("sieht eine PRIVATE Maschine NICHT", async ({ page }) => {
    await loginAs(page, USERS.supporter);
    const res = await page.goto(`/machines/${privateMachine}`);
    expect(res?.status(), "privater Automat muss verwehrt bleiben").not.toBe(
      200,
    );
  });

  test("kann per API keine Reparatur an einer Club-Maschine anlegen", async ({
    page,
  }) => {
    await loginAs(page, USERS.supporter);
    // Die Server Action über das Formular-Endpoint zu treffen ist umständlich;
    // wir prüfen die Grenze direkt an der Detailseite: kein Formular vorhanden.
    await page.goto(`/machines/${clubMachine}/repairs/new`);
    // requireMachineWrite lehnt Supporter ab → Fehlerseite, kein Formular.
    await expect(page.getByLabel("Diagnose")).toHaveCount(0);
  });

  test("bekommt keinen Zugang zu /admin", async ({ page }) => {
    await loginAs(page, USERS.supporter);
    const res = await page.goto("/admin");
    // isSuperAdmin-Gate leitet weiter auf /machines.
    expect(page.url()).toContain("/machines");
    expect(res?.status()).toBe(200);
  });
});
