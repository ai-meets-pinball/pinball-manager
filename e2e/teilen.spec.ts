import { expect, test } from "@playwright/test";
import {
  addFacts,
  addRepair,
  createMachine,
  sql,
  userIdByEmail,
} from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Geteiltes Wissen. Prüft die Reichweiten, die serverseitige Feldprojektion
  und zwei Review-Funde:
  - unshareRepair löschte fremde Freigaben (IDOR).
  - Ein Wechsel des Gerätetyps ließ Freigaben am alten Typ hängen.
*/

test.describe("Teilen", () => {
  let ownerMachine: string;
  let fremdMachine: string;
  let modelId: string;
  let repairId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    const outsiderId = await userIdByEmail(USERS.outsider);

    // Beide Maschinen sind derselbe Gerätetyp → geteiltes Wissen ist sichtbar.
    ({ machineId: ownerMachine, modelId } = await createMachine({
      ownerId,
      opdbRef: "E2E9-MSHARE",
    }));
    ({ machineId: fremdMachine } = await createMachine({
      ownerId: outsiderId,
      opdbRef: "E2E9-MSHARE",
    }));

    await addFacts(ownerMachine);
    repairId = await addRepair(ownerMachine);
  });

  test.afterAll(async () => {
    await sql`DELETE FROM shares WHERE artefakt_id IN (${ownerMachine}, ${repairId})`;
    await sql`DELETE FROM machines WHERE id IN (${ownerMachine}, ${fremdMachine})`;
  });

  test("ohne Freigabe sieht ein anderer Besitzer nichts", async ({ page }) => {
    await loginAs(page, USERS.outsider);
    await page.goto(`/machines/${fremdMachine}`);
    await expect(page.getByText("Geteilte Handbuch-Daten")).toHaveCount(0);
  });

  test("platform-Freigabe wird für andere sichtbar", async ({ page }) => {
    const ownerId = await userIdByEmail(USERS.owner);
    await sql`
      INSERT INTO shares (artefakt_typ, artefakt_id, model_id, owner_id, scope, anonym)
      VALUES ('machine_facts', ${ownerMachine}, ${modelId}, ${ownerId}, 'platform', true)`;

    await loginAs(page, USERS.outsider);
    await page.goto(`/machines/${fremdMachine}`);
    await expect(page.getByText("Geteilte Handbuch-Daten")).toBeVisible();
    await expect(page.getByText("anonym geteilt")).toBeVisible();
  });

  test("Feldprojektion: Kosten und Name bleiben verborgen", async ({ page }) => {
    const ownerId = await userIdByEmail(USERS.owner);
    await sql`
      INSERT INTO shares (artefakt_typ, artefakt_id, model_id, owner_id, scope, anonym, zeige_kosten)
      VALUES ('repair', ${repairId}, ${modelId}, ${ownerId}, 'platform', true, false)
      ON CONFLICT (artefakt_typ, artefakt_id) DO UPDATE
        SET anonym = true, zeige_kosten = false`;

    await loginAs(page, USERS.outsider);
    await page.goto(`/machines/${fremdMachine}`);

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
    await page.goto(`/machines/${fremdMachine}`);
    await expect(page.getByText("99.99")).toBeVisible();
  });

  test("club-Freigabe bleibt für Nichtmitglieder unsichtbar", async ({ page }) => {
    const ownerId = await userIdByEmail(USERS.owner);
    const [club] = await sql`
      INSERT INTO clubs (name, created_by) VALUES ('E2E Geheimclub', ${ownerId}) RETURNING id`;
    const [share] = await sql`
      UPDATE shares SET scope='club'
      WHERE artefakt_typ='machine_facts' AND artefakt_id=${ownerMachine} RETURNING id`;
    await sql`INSERT INTO share_targets (share_id, club_id) VALUES (${share.id}, ${club.id})`;

    await loginAs(page, USERS.outsider);
    await page.goto(`/machines/${fremdMachine}`);
    await expect(page.getByText("Geteilte Handbuch-Daten")).toHaveCount(0);

    await sql`DELETE FROM share_targets WHERE share_id=${share.id}`;
    await sql`DELETE FROM clubs WHERE id=${club.id}`;
  });

  test("Wechsel des Gerätetyps widerruft die Freigaben", async ({ page }) => {
    const ownerId = await userIdByEmail(USERS.owner);
    await sql`
      INSERT INTO shares (artefakt_typ, artefakt_id, model_id, owner_id, scope, anonym)
      VALUES ('machine_facts', ${ownerMachine}, ${modelId}, ${ownerId}, 'platform', true)
      ON CONFLICT (artefakt_typ, artefakt_id) DO UPDATE SET scope='platform'`;

    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${ownerMachine}/edit`);
    await page.getByLabel("OPDB-Referenz").fill("E2E8-MANDERS");
    await page.getByRole("button", { name: /speichern|aktualisieren/i }).click();
    await page.waitForURL(`**/machines/${ownerMachine}`);

    const rest = await sql`
      SELECT id FROM shares WHERE artefakt_typ='machine_facts' AND artefakt_id=${ownerMachine}`;
    expect(rest.length, "Freigabe muss widerrufen sein").toBe(0);
  });
});
