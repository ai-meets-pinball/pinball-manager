import { expect, test } from "@playwright/test";
import { addMember, createClub, sql, userIdByEmail } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Club-Seite: die Mitgliederzeile nach dem Admin-Muster — Badge inline, Stift
  öffnet den Rollen-Dialog (Speichern erst bei Änderung), Papierkorb/Verlassen
  als Icons. Der letzte Owner ist ausgegraut (rolleEntfernenGesperrt).
*/
test.describe("Club: Mitglieder-Rollen im Dialog", () => {
  let clubId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    const memberId = await userIdByEmail(USERS.member);
    clubId = await createClub("E2E Mitgliederclub", ownerId);
    await addMember(clubId, memberId, "member");
  });

  test.afterAll(async () => {
    await sql`DELETE FROM role_assignments WHERE club_id = ${clubId}`;
    await sql`DELETE FROM clubs WHERE id = ${clubId}`;
  });

  test("Owner ändert die Rolle eines Mitglieds im Dialog", async ({ page }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/clubs/${clubId}`);

    const zeile = page.locator("li", { hasText: USERS.member });
    await expect(zeile.getByText("Mitglied", { exact: true })).toBeVisible();
    await zeile.getByRole("button", { name: `Rolle von ${USERS.member} ändern` }).click();

    const dialog = zeile.locator("dialog[open]");
    await expect(dialog.getByRole("heading", { name: "Rolle ändern" })).toBeVisible();
    const speichern = dialog.getByRole("button", { name: "Speichern" });
    await expect(speichern).toBeDisabled();
    await dialog.locator('select[name="rolle"]').selectOption("admin");
    await expect(speichern).toBeEnabled();
    await speichern.click();

    await expect(zeile.locator("dialog[open]")).toHaveCount(0);
    await expect(zeile.getByText("Admin", { exact: true })).toBeVisible();
  });

  test("der einzige Owner kann sich weder entfernen noch austreten", async ({ page }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/clubs/${clubId}`);
    const ich = page.locator("li", { hasText: USERS.owner });
    const verlassen = ich.getByRole("button", { name: "Club verlassen" });
    await expect(verlassen).toBeDisabled();
    await expect(verlassen).toHaveAttribute("title", /mindestens einen Owner/);
  });
});
