import { expect, test } from "@playwright/test";
import { createClub, sql, userIdByEmail } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Admin-UI: das Zwei-Schritt-Confirm-Protokoll für destruktive Aktionen
  (ConfirmButton). Vorher löschte EIN Klick unwiderruflich — jetzt bewaffnet der
  erste Klick nur (Frage + Ja/Abbrechen), erst der zweite löscht wirklich.
*/
test.describe("Admin: Lösch-Bestätigung", () => {
  let clubId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    clubId = await createClub("E2E Löschclub", ownerId);
  });

  test.afterAll(async () => {
    // Falls der Test vor dem Löschen abbrach.
    await sql`DELETE FROM clubs WHERE id = ${clubId}`;
  });

  test("Löschen verlangt Bestätigung; Abbrechen bricht ab", async ({ page }) => {
    await loginAs(page, USERS.admin);
    await page.goto("/admin/clubs");

    // Auf die ZEILE des Testclubs scopen — es können weitere Clubs existieren.
    const zeile = page.locator("li", { hasText: "E2E Löschclub" });
    await expect(zeile).toBeVisible();

    // 1. Klick bewaffnet nur — nichts wird gelöscht. Die Frage nennt seit der
    // UX-Konsolidierung den Club beim Namen und die Folgen — deshalb lose.
    const frage = /E2E Löschclub.*löschen\?/;
    await zeile.getByLabel("Club löschen").click();
    await expect(zeile.getByText(frage)).toBeVisible();

    // Abbrechen: der native <dialog> schließt (bleibt aber im DOM montiert —
    // deshalb „nicht sichtbar", nicht „nicht vorhanden"), Club bleibt.
    await zeile.getByRole("button", { name: "Abbrechen" }).click();
    await expect(zeile.getByText(frage)).not.toBeVisible();
    await expect(zeile).toBeVisible();

    // Erneut bewaffnen und bestätigen → Zeile ist weg. deleteClubByAdmin bleibt
    // bewusst auf /admin/clubs (kein Sprung nach /clubs wie beim Selbstlöschen).
    await zeile.getByLabel("Club löschen").click();
    await zeile.getByRole("button", { name: "Ja, löschen" }).click();
    await expect(zeile).toHaveCount(0);

    await page.goto("/admin/clubs");
    await expect(page.getByText("E2E Löschclub")).toHaveCount(0);
  });
});
