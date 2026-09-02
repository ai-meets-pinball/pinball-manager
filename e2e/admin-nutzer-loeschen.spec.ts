import { expect, request, test } from "@playwright/test";
import { sql } from "./helpers/db";
import { BASE_URL, createAccount, loginAs, USERS } from "./helpers/auth";

/*
  Admin → Nutzer → Papierkorb: löscht ein fremdes Konto über das Confirm-Modal.
  Das Konto entsteht wie in echt (Einladung + Sign-up); danach ist es weg.
*/
test.describe("Admin: Konto löschen", () => {
  const email = "e2e-loeschen@e2e.local";

  test.beforeAll(async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    try {
      await createAccount(ctx, email, "E2E Löschkonto");
    } finally {
      await ctx.dispose();
    }
  });

  test.afterAll(async () => {
    // Falls der Test vor dem Löschen abbrach.
    await sql`DELETE FROM "user" WHERE email = ${email}`;
  });

  test("Papierkorb löscht das Konto nach Bestätigung; eigenes ist gesperrt", async ({ page }) => {
    await loginAs(page, USERS.admin);
    await page.goto("/admin?ansicht=liste");

    const zeile = page.locator("li", { hasText: email });
    await expect(zeile).toBeVisible();
    await zeile.getByLabel("Konto von E2E Löschkonto löschen").click();
    await zeile.getByRole("button", { name: "Ja, Konto löschen" }).click();
    await expect(page.locator("li", { hasText: email })).toHaveCount(0);

    // Das eigene Konto lässt sich hier nicht löschen.
    const ich = page.locator("li", { hasText: USERS.admin });
    await expect(ich.getByLabel(/^Konto von .* löschen$/)).toBeDisabled();
  });
});
