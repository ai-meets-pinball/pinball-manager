import { expect, test } from "@playwright/test";
import { createClub, createMachine, sql, userIdByEmail } from "./helpers/db";
import { USERS } from "./helpers/auth";

/*
  Sammel-QR (/s/<token>, öffentlich): die Geräteliste ist alphabetisch nach
  MODELL sortiert (so wie sie angezeigt wird: „Modell | Hersteller"), und ab
  sechs Geräten filtert ein Suchfeld (GET-Parameter q, ohne JS).
  Feedback 2026-09-19: „scheinbar zufällige Reihenfolge, keine Suche".
*/
const TOKEN = "e2e5a11e1c0de001";
const MODELLE = ["Zebra", "Mars", "Apollo", "Quasar", "Delta", "Nova"];

test.describe("Sammel-QR: Sortierung und Suche", () => {
  let clubId: string;
  const machineIds: string[] = [];

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    clubId = await createClub("E2E Sammel-QR Club", ownerId);
    await sql`UPDATE clubs SET qr_token = ${TOKEN} WHERE id = ${clubId}`;
    // Bewusst NICHT alphabetisch angelegt.
    for (const modell of MODELLE) {
      const { machineId } = await createMachine({
        ownerId,
        clubId,
        opdbRef: `E2E-SQR-${modell}`,
        modell,
      });
      machineIds.push(machineId);
    }
  });

  test.afterAll(async () => {
    await sql`DELETE FROM machines WHERE id = ANY(${machineIds})`;
    await sql`DELETE FROM clubs WHERE id = ${clubId}`;
  });

  test("Liste ist alphabetisch nach Modell", async ({ page }) => {
    await page.goto(`/s/${TOKEN}`);
    const namen = await page
      .getByRole("link", { name: /\| E2E Werke/ })
      .allInnerTexts();
    const modelle = namen.map((n) => n.split(" | ")[0].trim());
    expect(modelle).toEqual([...MODELLE].sort((a, b) => a.localeCompare(b, "de")));
  });

  test("Suchfeld filtert die Geräte, zurücksetzen zeigt alle", async ({ page }) => {
    await page.goto(`/s/${TOKEN}`);
    const suche = page.getByRole("textbox", { name: "Gerät suchen" });
    await expect(suche).toBeVisible();
    await suche.fill("qua");
    await suche.press("Enter");
    await expect(page).toHaveURL(/q=qua/);
    await expect(page.getByRole("link", { name: /Quasar/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Zebra/ })).toHaveCount(0);

    await page.goto(`/s/${TOKEN}?q=gibtsnicht`);
    await expect(page.getByText(/Kein Gerät passt zu/)).toBeVisible();
    await page.getByRole("link", { name: "zurücksetzen" }).click();
    await expect(page.getByRole("link", { name: /Zebra/ })).toBeVisible();
  });
});
