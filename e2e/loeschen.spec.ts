import { expect, test } from "@playwright/test";
import { createAccount, loginAs, USERS } from "./helpers/auth";
import {
  addKnowledge,
  addRepair,
  createClub,
  createMachine,
  sql,
  userIdByEmail,
} from "./helpers/db";

/*
  Maschine löschen: die Frage nennt, was ANDERE verlieren; geteilte
  Reparaturen werden zum Tipp am Modell befördert (lib/reparatur-tipp) oder
  erlöschen angekündigt; Freigaben bleiben nicht als Waisen in `shares`
  zurück; Wissen, das noch an der Maschine hängt, wandert ans Modell
  (lib/loeschfolgen + actions/machines.ts).
*/
test.describe("Maschine löschen — Folgen für andere", () => {
  let ownerId: string;

  test.beforeAll(async ({ request }) => {
    await createAccount(request, USERS.owner).catch(() => {});
    await createAccount(request, USERS.member).catch(() => {});
    ownerId = await userIdByEmail(USERS.owner);
  });

  test.afterAll(async () => {
    await sql`DELETE FROM knowledge WHERE created_by = ${ownerId} AND (titel = 'E2E Handbuch-Daten' OR titel LIKE 'Reparatur: E2E%')`;
    await sql`DELETE FROM clubs WHERE name = 'E2E Tipp-Club'`;
    await sql`DELETE FROM machines WHERE opdb_ref LIKE 'LOE%'`;
    await sql`DELETE FROM machine_models WHERE opdb_ref LIKE 'LOE%'`;
  });

  /** Löschen-Dialog der Detailseite öffnen und die Frage zurückgeben. */
  async function loeschenBewaffnen(page: import("@playwright/test").Page, machineId: string) {
    await page.goto(`/machines/${machineId}`);
    await page.getByRole("button", { name: "Löschen", exact: true }).click();
    return page.locator("dialog[open]");
  }

  /** Reparatur mit Freigabe anlegen; gibt repairId und shareId zurück. */
  async function geteilteReparatur(machineId: string, modelId: string, scope: string) {
    const repairId = await addRepair(machineId);
    const [share] = await sql`
      INSERT INTO shares (artefakt_typ, artefakt_id, model_id, owner_id, scope, anonym, zeige_kosten)
      VALUES ('repair', ${repairId}, ${modelId}, ${ownerId}, ${scope}, true, false)
      RETURNING id`;
    return { repairId, shareId: share.id as string };
  }

  test("platform-Freigabe wird zum öffentlichen, anonymen Tipp am Modell", async ({
    page,
  }) => {
    const { machineId, modelId } = await createMachine({ ownerId, opdbRef: "LOE1-AAA" });
    const { repairId } = await geteilteReparatur(machineId, modelId, "platform");

    await loginAs(page, USERS.owner);
    const dialog = await loeschenBewaffnen(page, machineId);
    await expect(
      dialog.getByText(/1 geteilte Reparatur bleibt als Tipp am Modell erhalten\./),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Ja, löschen" }).click();
    await page.waitForURL("**/machines");

    const [{ n }] = await sql`SELECT count(*)::int AS n FROM shares WHERE artefakt_id = ${repairId}`;
    expect(n, "die Freigabe darf nicht als Waise zurückbleiben").toBe(0);
    const tipps = await sql`
      SELECT k.visibility, k.anonym, k.club_id, t.model_id
      FROM knowledge k JOIN knowledge_targets t ON t.knowledge_id = k.id
      WHERE k.typ = 'tipp' AND k.created_by = ${ownerId} AND k.titel = 'Reparatur: E2E Diagnose'`;
    expect(tipps).toHaveLength(1);
    expect(tipps[0]).toMatchObject({ visibility: "oeffentlich", anonym: true, club_id: null, model_id: modelId });

    // Ein anderer Nutzer sieht den Tipp am Modell — ohne den Autor.
    await loginAs(page, USERS.member);
    await page.goto(`/modelle/${modelId}?bereich=tipps`);
    await expect(page.getByText("Reparatur: E2E Diagnose")).toBeVisible();
    await expect(page.getByText("Anonym geteilt")).toBeVisible();
    await expect(page.getByText(/Maßnahme: E2E Massnahme/)).toBeVisible();
  });

  test("Ein-Club-Freigabe wird zum Club-Tipp", async ({ page }) => {
    const clubId = await createClub("E2E Tipp-Club", ownerId);
    const { machineId, modelId } = await createMachine({ ownerId, opdbRef: "LOE5-EEE" });
    const { shareId } = await geteilteReparatur(machineId, modelId, "club");
    await sql`INSERT INTO share_targets (share_id, club_id) VALUES (${shareId}, ${clubId})`;

    await loginAs(page, USERS.owner);
    const dialog = await loeschenBewaffnen(page, machineId);
    await expect(dialog.getByText(/bleibt als Tipp am Modell erhalten/)).toBeVisible();
    await dialog.getByRole("button", { name: "Ja, löschen" }).click();
    await page.waitForURL("**/machines");

    const tipps = await sql`
      SELECT k.visibility, k.club_id FROM knowledge k
      WHERE k.typ = 'tipp' AND k.created_by = ${ownerId} AND k.visibility = 'club'`;
    expect(tipps).toHaveLength(1);
    expect(tipps[0].club_id).toBe(clubId);
  });

  test("Freigabe an einzelne Personen erlischt — angekündigt, kein Tipp", async ({
    page,
  }) => {
    const { machineId, modelId } = await createMachine({ ownerId, opdbRef: "LOE6-FFF" });
    const { repairId, shareId } = await geteilteReparatur(machineId, modelId, "users");
    const memberId = await userIdByEmail(USERS.member);
    await sql`INSERT INTO share_targets (share_id, user_id) VALUES (${shareId}, ${memberId})`;

    await loginAs(page, USERS.owner);
    const dialog = await loeschenBewaffnen(page, machineId);
    await expect(
      dialog.getByText(/1 Reparatur ist für einzelne Personen oder mehrere Clubs freigegeben — diese Freigabe erlischt\./),
    ).toBeVisible();
    await expect(dialog.getByText(/als Tipp/)).toHaveCount(0);
    await dialog.getByRole("button", { name: "Ja, löschen" }).click();
    await page.waitForURL("**/machines");

    const [{ n }] = await sql`SELECT count(*)::int AS n FROM shares WHERE artefakt_id = ${repairId}`;
    expect(n).toBe(0);
    const [{ t }] = await sql`
      SELECT count(*)::int AS t FROM knowledge
      WHERE typ = 'tipp' AND created_by = ${ownerId} AND titel LIKE 'Reparatur: E2E%' AND visibility <> 'oeffentlich' AND visibility <> 'club'`;
    expect(t, "aus einer Personen-Freigabe darf kein Tipp entstehen").toBe(0);
  });

  test("Wissen an der Maschine wandert ans Modell und bleibt erhalten", async ({
    page,
  }) => {
    const { machineId, modelId } = await createMachine({ ownerId, opdbRef: "LOE2-BBB" });
    // Altbestand nachstellen: Upload, als die Maschine noch kein Modell hatte.
    const kId = await addKnowledge({ modelId, createdBy: ownerId, visibility: "oeffentlich" });
    await sql`UPDATE knowledge SET model_id = NULL, machine_id = ${machineId} WHERE id = ${kId}`;

    await loginAs(page, USERS.owner);
    const dialog = await loeschenBewaffnen(page, machineId);
    await expect(
      dialog.getByText(/1 Wissenseintrag wird ans Modell übertragen und bleibt erhalten\./),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Ja, löschen" }).click();
    await page.waitForURL("**/machines");

    const [row] = await sql`SELECT model_id, machine_id FROM knowledge WHERE id = ${kId}`;
    expect(row, "der Eintrag muss die Maschine überleben").toBeTruthy();
    expect(row.model_id).toBe(modelId);
    expect(row.machine_id).toBeNull();
  });

  test("ohne Modell: Frage sagt, dass öffentliches Wissen verloren geht", async ({
    page,
  }) => {
    const { machineId, modelId } = await createMachine({ ownerId, opdbRef: "LOE3-CCC" });
    const kId = await addKnowledge({ modelId, createdBy: ownerId, visibility: "oeffentlich" });
    await sql`UPDATE knowledge SET model_id = NULL, machine_id = ${machineId} WHERE id = ${kId}`;
    await sql`UPDATE machines SET model_id = NULL WHERE id = ${machineId}`;

    await loginAs(page, USERS.owner);
    const dialog = await loeschenBewaffnen(page, machineId);
    await expect(
      dialog.getByText(/1 Wissenseintrag hängt nur an dieser Maschine und geht für alle verloren\./),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Ja, löschen" }).click();
    await page.waitForURL("**/machines");

    const [{ n }] = await sql`SELECT count(*)::int AS n FROM knowledge WHERE id = ${kId}`;
    expect(n, "ohne Modell gibt es kein Ziel — der Eintrag geht (angekündigt) mit").toBe(0);
  });

  test("Reparatur löschen nimmt ihre Freigabe mit", async ({ page }) => {
    const { machineId, modelId } = await createMachine({ ownerId, opdbRef: "LOE4-DDD" });
    const repairId = await addRepair(machineId);
    await sql`
      INSERT INTO shares (artefakt_typ, artefakt_id, model_id, owner_id, scope, anonym, zeige_kosten)
      VALUES ('repair', ${repairId}, ${modelId}, ${ownerId}, 'platform', true, false)`;

    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}?bereich=reparaturen`);
    await page.getByLabel("Reparatur löschen").click();
    await page.locator("dialog[open]").getByRole("button", { name: "Ja, löschen" }).click();
    await expect(page.getByLabel("Reparatur löschen")).toHaveCount(0);

    const [{ n }] = await sql`SELECT count(*)::int AS n FROM shares WHERE artefakt_id = ${repairId}`;
    expect(n).toBe(0);
  });
});
