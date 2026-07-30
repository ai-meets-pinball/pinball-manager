import { expect, test } from "@playwright/test";
import { addKnowledge, createMachine, sql, userIdByEmail } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Community-Signale (Datenmodell-Redesign Phase 5): ein anderer Nutzer markiert
  fremdes, öffentliches Wissen als „hilfreich" — der Zähler steigt, den eigenen
  Eintrag kann man nicht bewerten.
*/
test.describe("Community-Signale", () => {
  let ownerMachine: string;
  let fremdMachine: string;
  let modelId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    const outsiderId = await userIdByEmail(USERS.outsider);

    ({ machineId: ownerMachine, modelId } = await createMachine({
      ownerId,
      opdbRef: "E2E6-SIG",
    }));
    ({ machineId: fremdMachine } = await createMachine({
      ownerId: outsiderId,
      opdbRef: "E2E6-SIG",
    }));
    // Öffentliches Modell-Wissen des Owners — für den Outsider sichtbar.
    await addKnowledge({ modelId, createdBy: ownerId, visibility: "oeffentlich" });
  });

  test.afterAll(async () => {
    // knowledge_signals hängt per FK (cascade) am Eintrag.
    await sql`DELETE FROM knowledge WHERE model_id = ${modelId}`;
    await sql`DELETE FROM machines WHERE id IN (${ownerMachine}, ${fremdMachine})`;
  });

  test('„Hilfreich" erhöht den Zähler für einen anderen Nutzer', async ({
    page,
  }) => {
    await loginAs(page, USERS.outsider);
    await page.goto(`/machines/${fremdMachine}?bereich=handbuch`);

    const hilfreich = page.getByRole("button", { name: /Hilfreich/ });
    await expect(hilfreich).toBeVisible();
    await hilfreich.click();

    // Nach dem Signal zeigt der Button den Zähler.
    await expect(
      page.getByRole("button", { name: /Hilfreich · 1/ }),
    ).toBeVisible();
  });

  test("den eigenen Eintrag kann der Autor nicht bewerten", async ({ page }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${ownerMachine}?bereich=handbuch`);

    // Eigener Eintrag: nur Zähler, kein „Hilfreich"-Button.
    await expect(page.getByText("Deine Handbuch-Daten")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Hilfreich/ }),
    ).toHaveCount(0);
  });
});
