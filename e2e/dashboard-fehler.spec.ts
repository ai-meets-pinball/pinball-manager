import { expect, test } from "@playwright/test";
import { addFault, createMachine, sql, userIdByEmail } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Übersicht: offene Fehler nach Priorität (Standard) oder Neueste — Umschalter
  über der Liste, Wahl gemerkt (Feedback 09/2026).
*/
test.describe("Übersicht: Fehler-Sortierung", () => {
  let machineId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    ({ machineId } = await createMachine({ ownerId, opdbRef: "E2E-DASHF" }));
    await addFault({ machineId, beschreibung: "E2E Sortierung mittel neu", prioritaet: "mittel" });
    const kritisch = await addFault({
      machineId,
      beschreibung: "E2E Sortierung kritisch alt",
      prioritaet: "kritisch",
    });
    await sql`UPDATE faults SET datum = now() - interval '2 days' WHERE id = ${kritisch}`;
  });

  test.afterAll(async () => {
    await sql`DELETE FROM machines WHERE id = ${machineId}`;
  });

  const reihenfolge = async (page: import("@playwright/test").Page) => {
    const texte = await page.locator("section#fehler li").allInnerTexts();
    return {
      kritisch: texte.findIndex((t) => t.includes("E2E Sortierung kritisch alt")),
      mittel: texte.findIndex((t) => t.includes("E2E Sortierung mittel neu")),
    };
  };

  test("Priorität zuerst, Umschalter auf Neueste dreht die Reihenfolge", async ({ page }) => {
    await loginAs(page, USERS.owner);
    await page.goto("/dashboard?bereich=&ansicht=liste&fehlerSort=prioritaet");
    let r = await reihenfolge(page);
    expect(r.kritisch).toBeGreaterThanOrEqual(0);
    expect(r.kritisch).toBeLessThan(r.mittel);

    await page.getByRole("link", { name: "Neueste" }).click();
    await expect(page).toHaveURL(/fehlerSort=neueste/);
    r = await reihenfolge(page);
    expect(r.mittel).toBeLessThan(r.kritisch);
  });
});
