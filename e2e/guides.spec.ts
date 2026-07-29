import { expect, test } from "@playwright/test";
import {
  addGuide,
  createMachine,
  setModelGeneration,
  sql,
  userIdByEmail,
} from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Troubleshooting-Guides als Modell-Wissen (Datenmodell-Redesign Phase 2) und der
  Generation-Resolver: Wissen auf Generation-Ebene erscheint an ALLEN Modellen
  dieser Board-/Hardware-Generation — auch bei einem anderen Besitzer mit einem
  ANDEREN Modell derselben Generation. Sichtbarkeit gilt wie überall
  (privat|club|oeffentlich, Autor immer sichtbar).
*/
test.describe("Guides & Generation-Resolver", () => {
  let ownerMachine: string;
  let ownerModel: string;
  let fremdMachine: string;
  let fremdModel: string;
  let generationId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    const outsiderId = await userIdByEmail(USERS.outsider);

    // Zwei UNTERSCHIEDLICHE Modelle, aber dieselbe Generation.
    ({ machineId: ownerMachine, modelId: ownerModel } = await createMachine({
      ownerId,
      opdbRef: "E2E7-GENA",
    }));
    ({ machineId: fremdMachine, modelId: fremdModel } = await createMachine({
      ownerId: outsiderId,
      opdbRef: "E2E7-GENB",
    }));
    await setModelGeneration(ownerModel, "E2E Board-Gen");
    generationId = await setModelGeneration(fremdModel, "E2E Board-Gen");
  });

  test.afterAll(async () => {
    await sql`DELETE FROM knowledge WHERE model_id IN (${ownerModel}, ${fremdModel}) OR generation_id = ${generationId}`;
    await sql`UPDATE machine_models SET generation_id = NULL WHERE id IN (${ownerModel}, ${fremdModel})`;
    await sql`DELETE FROM machines WHERE id IN (${ownerMachine}, ${fremdMachine})`;
    await sql`DELETE FROM generations WHERE id = ${generationId}`;
  });

  test("privater Guide ist für andere nicht sichtbar", async ({ page }) => {
    const ownerId = await userIdByEmail(USERS.owner);
    await addGuide({ createdBy: ownerId, modelId: ownerModel, visibility: "privat" });

    await loginAs(page, USERS.outsider);
    await page.goto(`/machines/${fremdMachine}?bereich=guide`);
    await expect(page.getByText("Geteilt von")).toHaveCount(0);
  });

  test("öffentliches Generation-Wissen erscheint an einem anderen Modell derselben Generation", async ({
    page,
  }) => {
    const ownerId = await userIdByEmail(USERS.owner);
    await addGuide({ createdBy: ownerId, generationId, visibility: "oeffentlich" });

    await loginAs(page, USERS.outsider);
    await page.goto(`/machines/${fremdMachine}?bereich=guide`);
    // Der Generation-Guide des Owners erscheint an der fremden Instanz (Resolver),
    // mit Autor (keine Anonymität) und Generation-Kennzeichnung. `.first()`, weil
    // der Besitzer auch das Formular mit der Ebene-Option „Ganze Generation" sieht.
    await expect(page.getByText("Geteilt von")).toBeVisible();
    await expect(
      page.getByText(/Generation .*E2E Board-Gen/).first(),
    ).toBeVisible();
  });

  test("der Autor sieht seinen eigenen Guide als Dein Guide", async ({ page }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${ownerMachine}?bereich=guide`);
    await expect(page.getByText("Dein Guide").first()).toBeVisible();
  });
});
