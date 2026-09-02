import { expect, test } from "@playwright/test";
import { addMaintenanceLog, createMachine, sql, userIdByEmail } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Wartungs-Reiter: der Haken „als erledigt eintragen" öffnet einen kleinen
  Dialog (Datum, Notiz); Eintragen schließt ihn und die Historie wächst.
*/
test.describe("Wartung: Erledigt-Dialog", () => {
  let machineId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    ({ machineId } = await createMachine({ ownerId, opdbRef: "E2E11-WERL" }));
    await addMaintenanceLog(machineId); // legt „E2E Wartungspunkt" + 1 Historie-Eintrag an
  });

  test.afterAll(async () => {
    await sql`DELETE FROM machines WHERE id = ${machineId}`;
  });

  test("Erledigt eintragen über den Dialog", async ({ page }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}?bereich=wartung`);

    const zeile = page.locator("li", { hasText: "E2E Wartungspunkt" });
    await expect(zeile.getByText("Historie (1)")).toBeVisible();

    await zeile.getByRole("button", { name: "E2E Wartungspunkt als erledigt eintragen" }).click();
    const dialog = zeile.locator("dialog[open]");
    await expect(dialog.getByRole("heading", { name: "Erledigt eintragen" })).toBeVisible();
    await dialog.getByLabel("Notiz (optional)").fill("E2E: Gummis erneuert");
    await dialog.getByRole("button", { name: "Eintragen" }).click();

    await expect(zeile.locator("dialog[open]")).toHaveCount(0);
    await expect(zeile.getByText("Historie (2)")).toBeVisible();
  });
});
