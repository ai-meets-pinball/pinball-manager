import { expect, test } from "@playwright/test";
import {
  addKnowledge,
  addRepair,
  createMachine,
  sql,
  userIdByEmail,
} from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Geteiltes Wissen. Prüft die Sichtbarkeit von Modell-Wissen (Handbuch-Fakten in
  `knowledge`, Achse privat|club|oeffentlich, Autor immer sichtbar), die
  serverseitige Feldprojektion der Reparaturen und zwei Review-Funde:
  - unshareRepair löschte fremde Freigaben (IDOR).
  - Ein Wechsel des Modells ließ Reparatur-Freigaben am alten Typ hängen.
*/

test.describe("Teilen", () => {
  let ownerMachine: string;
  let fremdMachine: string;
  let modelId: string;
  let repairId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    const outsiderId = await userIdByEmail(USERS.outsider);

    // Beide Maschinen sind dasselbe Modell → geteiltes Wissen ist sichtbar.
    ({ machineId: ownerMachine, modelId } = await createMachine({
      ownerId,
      opdbRef: "E2E9-MSHARE",
    }));
    ({ machineId: fremdMachine } = await createMachine({
      ownerId: outsiderId,
      opdbRef: "E2E9-MSHARE",
    }));

    // Handbuch-Fakten als Modell-Wissen, zunächst privat (nur der Autor sieht sie).
    await addKnowledge({ modelId, createdBy: ownerId, visibility: "privat" });
    repairId = await addRepair(ownerMachine);
  });

  test.afterAll(async () => {
    await sql`DELETE FROM knowledge WHERE model_id = ${modelId}`;
    await sql`DELETE FROM shares WHERE artefakt_id IN (${ownerMachine}, ${repairId})`;
    await sql`DELETE FROM machines WHERE id IN (${ownerMachine}, ${fremdMachine})`;
  });

  test("privates Modell-Wissen sieht ein anderer Besitzer nicht", async ({ page }) => {
    await loginAs(page, USERS.outsider);
    // Modell-Wissen lebt im Reiter „Handbuch".
    await page.goto(`/machines/${fremdMachine}?bereich=handbuch`);
    await expect(page.getByText("Geteilt von")).toHaveCount(0);
    await expect(page.getByText("E2E Spule")).toHaveCount(0);
  });

  test("öffentliches Modell-Wissen wird für andere sichtbar", async ({ page }) => {
    await sql`
      UPDATE knowledge SET visibility='oeffentlich'
      WHERE typ='handbuch_fakten' AND model_id=${modelId}`;

    await loginAs(page, USERS.outsider);
    await page.goto(`/machines/${fremdMachine}?bereich=handbuch`);
    // Autor ist immer sichtbar (keine Anonymität) und die Faktentabelle
    // (Abschnitt „Spulen & Flasher") erscheint — Inhalt selbst ist eingeklappt.
    await expect(page.getByText("Geteilt von")).toBeVisible();
    await expect(page.getByText("Spulen & Flasher").first()).toBeVisible();
  });

  test("Feldprojektion: Kosten und Name bleiben verborgen", async ({ page }) => {
    const ownerId = await userIdByEmail(USERS.owner);
    await sql`
      INSERT INTO shares (artefakt_typ, artefakt_id, model_id, owner_id, scope, anonym, zeige_kosten)
      VALUES ('repair', ${repairId}, ${modelId}, ${ownerId}, 'platform', true, false)
      ON CONFLICT (artefakt_typ, artefakt_id) DO UPDATE
        SET anonym = true, zeige_kosten = false`;

    await loginAs(page, USERS.outsider);
    // Geteilte Reparaturen leben im Reiter „Reparaturen".
    await page.goto(`/machines/${fremdMachine}?bereich=reparaturen`);

    // Fachinhalt ist da …
    await expect(page.getByText("E2E Diagnose")).toBeVisible();
    // … Kosten, Aufwand und Urheber nicht.
    await expect(page.getByText("99.99")).toHaveCount(0);
    await expect(page.getByText("42 Min")).toHaveCount(0);
    await expect(page.getByText(USERS.owner)).toHaveCount(0);
  });

  test("nach Umschalten erscheinen Kosten", async ({ page }) => {
    await sql`
      UPDATE shares SET zeige_kosten = true, anonym = false
      WHERE artefakt_typ='repair' AND artefakt_id = ${repairId}`;

    await loginAs(page, USERS.outsider);
    await page.goto(`/machines/${fremdMachine}?bereich=reparaturen`);
    await expect(page.getByText("99.99")).toBeVisible();
  });

  test("club-sichtbares Modell-Wissen bleibt für Nichtmitglieder unsichtbar", async ({ page }) => {
    const ownerId = await userIdByEmail(USERS.owner);
    const [club] = await sql`
      INSERT INTO clubs (name, created_by) VALUES ('E2E Geheimclub', ${ownerId}) RETURNING id`;
    await sql`
      UPDATE knowledge SET visibility='club', club_id=${club.id}
      WHERE typ='handbuch_fakten' AND model_id=${modelId}`;

    await loginAs(page, USERS.outsider);
    await page.goto(`/machines/${fremdMachine}?bereich=handbuch`);
    await expect(page.getByText("Geteilt von")).toHaveCount(0);
    await expect(page.getByText("E2E Spule")).toHaveCount(0);

    // Sichtbarkeit zurücksetzen und den Testclub entfernen.
    await sql`
      UPDATE knowledge SET visibility='oeffentlich', club_id=NULL
      WHERE typ='handbuch_fakten' AND model_id=${modelId}`;
    await sql`DELETE FROM clubs WHERE id=${club.id}`;
  });

  test("Wechsel des Modells widerruft die Reparatur-Freigaben", async ({ page }) => {
    const ownerId = await userIdByEmail(USERS.owner);
    await sql`
      INSERT INTO shares (artefakt_typ, artefakt_id, model_id, owner_id, scope, anonym)
      VALUES ('repair', ${repairId}, ${modelId}, ${ownerId}, 'platform', true)
      ON CONFLICT (artefakt_typ, artefakt_id) DO UPDATE SET scope='platform'`;

    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${ownerMachine}/edit`);
    // Beim Bearbeiten ist das Modell read-only; „Manuell anpassen" gibt die Felder frei.
    await page.getByRole("button", { name: "Manuell anpassen" }).click();
    await page.getByLabel("OPDB-Referenz").fill("E2E8-MANDERS");
    await page.getByRole("button", { name: /speichern|aktualisieren/i }).click();
    await page.waitForURL(`**/machines/${ownerMachine}`);

    const rest = await sql`
      SELECT id FROM shares WHERE artefakt_typ='repair' AND artefakt_id=${repairId}`;
    expect(rest.length, "Freigabe muss widerrufen sein").toBe(0);
  });
});
