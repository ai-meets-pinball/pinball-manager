import { expect, test } from "@playwright/test";
import {
  addKnowledge,
  addSignal,
  createMachine,
  sql,
  userIdByEmail,
} from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Community-Warnung (Datenmodell-Redesign Phase 5): melden mehrere Nutzer einen
  Eintrag als „falsch" (mind. 2× und mehr „falsch" als „hilfreich"), erscheint ein
  Warnhinweis. Rein anzeigend — nichts wird automatisch verborgen.
*/
test.describe("Community-Warnung (mehrfach gemeldet)", () => {
  let ownerMachine: string;
  let fremdMachine: string;
  let modelId: string;
  let knowledgeId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    const outsiderId = await userIdByEmail(USERS.outsider);
    const memberId = await userIdByEmail(USERS.member);

    ({ machineId: ownerMachine, modelId } = await createMachine({
      ownerId,
      opdbRef: "E2E4-GEM",
    }));
    ({ machineId: fremdMachine } = await createMachine({
      ownerId: outsiderId,
      opdbRef: "E2E4-GEM",
    }));
    knowledgeId = await addKnowledge({
      modelId,
      createdBy: ownerId,
      visibility: "oeffentlich",
    });
    // Zwei „falsch"-Meldungen (verschiedene Nutzer) → über der Schwelle.
    await addSignal(knowledgeId, outsiderId, "falsch");
    await addSignal(knowledgeId, memberId, "falsch");
  });

  test.afterAll(async () => {
    await sql`DELETE FROM knowledge WHERE model_id = ${modelId}`;
    await sql`DELETE FROM machines WHERE id IN (${ownerMachine}, ${fremdMachine})`;
  });

  test("mehrfach als fehlerhaft gemeldet zeigt den Warnhinweis", async ({
    page,
  }) => {
    await loginAs(page, USERS.outsider);
    await page.goto(`/machines/${fremdMachine}?bereich=handbuch`);
    await expect(page.getByText(/als fehlerhaft gemeldet/)).toBeVisible();
  });
});
