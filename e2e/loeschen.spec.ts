import { expect, test } from "@playwright/test";
import { createAccount, loginAs, USERS } from "./helpers/auth";
import {
  addKnowledge,
  addRepair,
  createMachine,
  sql,
  userIdByEmail,
} from "./helpers/db";

/*
  Maschine löschen: die Frage nennt, was ANDERE verlieren, Freigaben bleiben
  nicht als Waisen in `shares` zurück, und Wissen, das noch an der Maschine
  hängt, wandert ans Modell (lib/loeschfolgen + actions/machines.ts).
*/
test.describe("Maschine löschen — Folgen für andere", () => {
  let ownerId: string;

  test.beforeAll(async ({ request }) => {
    await createAccount(request, USERS.owner).catch(() => {});
    ownerId = await userIdByEmail(USERS.owner);
  });

  test.afterAll(async () => {
    await sql`DELETE FROM knowledge WHERE titel = 'E2E Handbuch-Daten' AND created_by = ${ownerId}`;
    await sql`DELETE FROM machines WHERE opdb_ref LIKE 'LOE%'`;
    await sql`DELETE FROM machine_models WHERE opdb_ref LIKE 'LOE%'`;
  });

  /** Löschen-Dialog der Detailseite öffnen und die Frage zurückgeben. */
  async function loeschenBewaffnen(page: import("@playwright/test").Page, machineId: string) {
    await page.goto(`/machines/${machineId}`);
    await page.getByRole("button", { name: "Löschen", exact: true }).click();
    return page.locator("dialog[open]");
  }

  test("geteilte Reparatur: Frage nennt die Freigabe, Löschen räumt sie ab", async ({
    page,
  }) => {
    const { machineId, modelId } = await createMachine({ ownerId, opdbRef: "LOE1-AAA" });
    const repairId = await addRepair(machineId);
    await sql`
      INSERT INTO shares (artefakt_typ, artefakt_id, model_id, owner_id, scope, anonym, zeige_kosten)
      VALUES ('repair', ${repairId}, ${modelId}, ${ownerId}, 'platform', true, false)`;

    await loginAs(page, USERS.owner);
    const dialog = await loeschenBewaffnen(page, machineId);
    await expect(
      dialog.getByText(/1 Reparatur ist für andere freigegeben — die Freigabe erlischt\./),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Ja, löschen" }).click();
    await page.waitForURL("**/machines");

    const [{ n }] = await sql`SELECT count(*)::int AS n FROM shares WHERE artefakt_id = ${repairId}`;
    expect(n, "die Freigabe darf nicht als Waise zurückbleiben").toBe(0);
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
