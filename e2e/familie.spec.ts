import { expect, test } from "@playwright/test";
import {
  addGuide,
  addKnowledge,
  addRepair,
  createMachine,
  setModelGeneration,
  sql,
  userIdByEmail,
} from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Familie: baugleiche OPDB-Editionen (gleiche ersten zwei Segmente) teilen ihr
  Wissen, ohne dass ihre Katalogzeilen verschmelzen. Aufbau wie in teilen.spec.ts:
  - LE-Maschine des Owners auf "E2E9-MFAM-ALE" (3 Segmente),
  - Premium/LE-Maschine des Outsiders auf "E2E9-MFAM" (2 Segmente),
  - Pro-Maschine als Gegenprobe auf "E2E9-MPRO" (andere Maschine, nicht baugleich).
  Wissen, Freigabe und Generation hängen an der 2-teiligen Zeile; die LE-Maschine
  muss sie sehen, die Pro-Maschine nicht.
*/
test.describe("Familie (baugleiche Editionen)", () => {
  let leMachine: string;
  let leModelId: string;
  let premiumLeMachine: string;
  let premiumLeModelId: string;
  let proMachine: string;
  let proModelId: string;
  let repairId: string;
  let ownerId: string;

  test.beforeAll(async () => {
    ownerId = await userIdByEmail(USERS.owner);
    const outsiderId = await userIdByEmail(USERS.outsider);

    ({ machineId: leMachine, modelId: leModelId } = await createMachine({
      ownerId,
      opdbRef: "E2E9-MFAM-ALE",
      modell: "E2E Familie (LE)",
    }));
    ({ machineId: premiumLeMachine, modelId: premiumLeModelId } =
      await createMachine({
        ownerId: outsiderId,
        opdbRef: "E2E9-MFAM",
        modell: "E2E Familie (Premium/LE)",
      }));
    ({ machineId: proMachine, modelId: proModelId } = await createMachine({
      ownerId,
      opdbRef: "E2E9-MPRO",
      modell: "E2E Familie (Pro)",
    }));

    // Wissen + Freigabe + Generation hängen an der 2-teiligen Zeile (Outsider).
    await addKnowledge({
      modelId: premiumLeModelId,
      createdBy: outsiderId,
      visibility: "oeffentlich",
    });
    repairId = await addRepair(premiumLeMachine);
    await sql`
      INSERT INTO shares (artefakt_typ, artefakt_id, model_id, owner_id, scope, anonym, zeige_kosten)
      VALUES ('repair', ${repairId}, ${premiumLeModelId}, ${outsiderId}, 'platform', false, true)`;
    const genId = await setModelGeneration(premiumLeModelId, "E2E Familien-Gen");
    await addGuide({
      createdBy: outsiderId,
      generationId: genId,
      visibility: "oeffentlich",
    });
  });

  test.afterAll(async () => {
    await sql`DELETE FROM shares WHERE artefakt_id = ${repairId}`;
    await sql`DELETE FROM knowledge WHERE model_id IN (${leModelId}, ${premiumLeModelId}, ${proModelId})`;
    await sql`DELETE FROM knowledge WHERE generation_id IN (SELECT id FROM generations WHERE name = 'E2E Familien-Gen')`;
    await sql`DELETE FROM machines WHERE id IN (${leMachine}, ${premiumLeMachine}, ${proMachine})`;
    await sql`DELETE FROM machine_models WHERE opdb_ref IN ('E2E9-MFAM-ALE', 'E2E9-MFAM', 'E2E9-MPRO')`;
    await sql`DELETE FROM generations WHERE name = 'E2E Familien-Gen'`;
  });

  test("Familienschlüssel steht in der Datenbank wie die Regel es sagt", async () => {
    const rows = await sql`
      SELECT opdb_ref, opdb_machine_ref FROM machine_models
      WHERE opdb_ref IN ('E2E9-MFAM-ALE', 'E2E9-MFAM', 'E2E9-MPRO')`;
    const byRef = Object.fromEntries(rows.map((r) => [r.opdb_ref, r.opdb_machine_ref]));
    expect(byRef["E2E9-MFAM-ALE"]).toBe("E2E9-MFAM");
    expect(byRef["E2E9-MFAM"]).toBe("E2E9-MFAM");
    expect(byRef["E2E9-MPRO"]).toBe("E2E9-MPRO");
  });

  test("Handbuch-Wissen der Premium/LE-Zeile erscheint an der LE-Maschine, nicht an der Pro", async ({
    page,
  }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${leMachine}?bereich=handbuch`);
    await expect(page.getByText("Geteilt von")).toBeVisible();
    await expect(page.getByText("Spulen & Flasher").first()).toBeVisible();

    await page.goto(`/machines/${proMachine}?bereich=handbuch`);
    await expect(page.getByText("Geteilt von")).toHaveCount(0);
  });

  test("geteilte Reparatur und Generations-Guide gelten für die ganze Familie", async ({
    page,
  }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${leMachine}?bereich=reparaturen`);
    // Der Reparatur-Bereich listet fremde Freigaben unter „Geteiltes Wissen".
    await expect(page.getByText(/Geteiltes Wissen \(1\)/)).toBeVisible();

    await page.goto(`/machines/${leMachine}?bereich=guide`);
    await expect(page.getByText("E2E-Abschnitt")).toBeVisible();

    await page.goto(`/machines/${proMachine}?bereich=guide`);
    await expect(page.getByText("E2E-Abschnitt")).toHaveCount(0);
  });

  test("Modellwechsel innerhalb der Familie behält Freigaben, außerhalb widerruft er sie", async ({
    page,
  }) => {
    // Eigene Freigabe des Owners an der LE-Maschine.
    const eigeneRepair = await addRepair(leMachine);
    await sql`
      INSERT INTO shares (artefakt_typ, artefakt_id, model_id, owner_id, scope, anonym, zeige_kosten)
      VALUES ('repair', ${eigeneRepair}, ${leModelId}, ${ownerId}, 'platform', false, false)`;
    const freigaben = async () =>
      (await sql`SELECT count(*)::int AS n FROM shares WHERE artefakt_id = ${eigeneRepair}`)[0].n;

    await loginAs(page, USERS.owner);
    // LE → Premium/LE (baugleich): Freigabe bleibt.
    await page.goto(`/machines/${leMachine}/edit`);
    await page.getByRole("button", { name: "Manuell anpassen" }).click();
    await page.getByLabel("OPDB-Referenz").fill("E2E9-MFAM");
    await page.getByRole("button", { name: /speichern|aktualisieren/i }).click();
    await page.waitForURL(`**/machines/${leMachine}`);
    expect(await freigaben()).toBe(1);

    // Premium/LE → Pro (andere Maschine): Freigabe wird widerrufen.
    await page.goto(`/machines/${leMachine}/edit`);
    await page.getByRole("button", { name: "Manuell anpassen" }).click();
    await page.getByLabel("OPDB-Referenz").fill("E2E9-MPRO");
    await page.getByRole("button", { name: /speichern|aktualisieren/i }).click();
    await page.waitForURL(`**/machines/${leMachine}`);
    expect(await freigaben()).toBe(0);

    // Zurück auf die LE-Referenz, damit der Folgetest die Familie sieht.
    await sql`UPDATE machines SET model_id = ${leModelId}, opdb_ref = 'E2E9-MFAM-ALE' WHERE id = ${leMachine}`;
  });

  test("Modellseite nennt die baugleiche Edition; Wissensbasis zeigt die Familie einmal", async ({
    page,
  }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/modelle/${leModelId}`);
    await expect(page.getByText(/Baugleich mit:/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "E2E Familie (Premium/LE)" }),
    ).toBeVisible();

    await page.goto("/modelle");
    // Ein Eintrag je Familie: der editionsneutrale Vertreter, die LE als „auch …".
    const karte = page.locator("a", { hasText: "E2E Familie (Premium/LE)" });
    await expect(karte).toHaveCount(1);
    await expect(karte.getByText(/auch E2E Familie \(LE\)/)).toBeVisible();
    await expect(
      page.locator("a", { hasText: "E2E Familie (LE) | E2E Werke" }),
    ).toHaveCount(0);
  });
});
