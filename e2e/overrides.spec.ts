import { expect, test } from "@playwright/test";
import { addKnowledge, createMachine, sql, userIdByEmail } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Persönliches Ausblenden (Datenmodell-Redesign Phase 5): ein Nutzer blendet
  fremdes, öffentliches Wissen für SICH aus — es wird zum Stub „Ausgeblendet …"
  mit „Einblenden". Rein persönlich; ändert nichts für andere.
*/
test.describe("Persönliches Ausblenden", () => {
  let ownerMachine: string;
  let fremdMachine: string;
  let modelId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    const outsiderId = await userIdByEmail(USERS.outsider);

    ({ machineId: ownerMachine, modelId } = await createMachine({
      ownerId,
      opdbRef: "E2E5-OVR",
    }));
    ({ machineId: fremdMachine } = await createMachine({
      ownerId: outsiderId,
      opdbRef: "E2E5-OVR",
    }));
    await addKnowledge({ modelId, createdBy: ownerId, visibility: "oeffentlich" });
  });

  test.afterAll(async () => {
    // knowledge_overrides hängt per FK (cascade) am Eintrag.
    await sql`DELETE FROM knowledge WHERE model_id = ${modelId}`;
    await sql`DELETE FROM machines WHERE id IN (${ownerMachine}, ${fremdMachine})`;
  });

  test("Ausblenden ersetzt den Eintrag durch einen Einblenden-Stub", async ({
    page,
  }) => {
    await loginAs(page, USERS.outsider);
    await page.goto(`/machines/${fremdMachine}?bereich=handbuch`);

    // Fremder öffentlicher Eintrag ist da.
    await expect(page.getByText("Geteilt von")).toBeVisible();

    await page.getByRole("button", { name: /Ausblenden/ }).click();

    // Jetzt nur noch der Stub mit „Einblenden"; der Inhalt ist weg.
    await expect(page.getByText("Ausgeblendet:")).toBeVisible();
    await expect(page.getByText("Geteilt von")).toHaveCount(0);

    // Wiederherstellen.
    await page.getByRole("button", { name: /Einblenden/ }).click();
    await expect(page.getByText("Geteilt von")).toBeVisible();
  });

  test("das Ausblenden ist persönlich — der Autor sieht seinen Eintrag normal", async ({
    page,
  }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${ownerMachine}?bereich=handbuch`);
    // Eigener Eintrag: kein Ausblenden-Button.
    await expect(page.getByText("Deine Handbuch-Daten")).toBeVisible();
    await expect(page.getByRole("button", { name: /Ausblenden/ })).toHaveCount(0);
  });
});
