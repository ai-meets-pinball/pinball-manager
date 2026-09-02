import { expect, test } from "@playwright/test";
import { createClub, sql, userIdByEmail } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Admin → Nutzer (Kartenansicht): eine Zeile je Zuweisung (Stift/Papierkorb) und EIN
  Dialog für Hinzufügen und Ändern. Geprüft wird der ganze Weg einer Club-Rolle
  (hinzufügen → ändern → entziehen) sowie die beiden Sperren, die das UI schon
  vor dem Server ausgraut: letzter Owner eines Clubs, eigene globale Rolle.
*/
test.describe("Admin: Rollen je Nutzer", () => {
  let clubId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    clubId = await createClub("E2E Rollenclub", ownerId);
  });

  test.afterAll(async () => {
    await sql`DELETE FROM role_assignments WHERE club_id = ${clubId}`;
    await sql`DELETE FROM clubs WHERE id = ${clubId}`;
  });

  test("Club-Rolle hinzufügen, ändern und entziehen", async ({ page }) => {
    await loginAs(page, USERS.admin);
    await page.goto("/admin");

    // Die Nutzer-Karte des Mitglieds (Kartenansicht = Default); Rollen liegen offen.
    const nutzer = page.locator("li", { hasText: USERS.member });

    // Hinzufügen: Dialog → Wo? → Rolle → Hinzufügen.
    await nutzer.getByRole("button", { name: "Rolle hinzufügen" }).click();
    const dialog = nutzer.locator("dialog[open]");
    await expect(dialog.getByRole("heading", { name: "Rolle hinzufügen" })).toBeVisible();
    await dialog.getByLabel("Wo?").selectOption({ label: "E2E Rollenclub" });
    await dialog.locator('select[name="rolle"]').selectOption({ label: "Admin" });
    await dialog.getByRole("button", { name: "Hinzufügen" }).click();

    const rolle = nutzer.locator("li", { hasText: "E2E Rollenclub" });
    await expect(rolle.getByText("Admin", { exact: true })).toBeVisible();

    // Ändern: Speichern ist erst aktiv, wenn sich der Wert unterscheidet.
    await rolle.getByLabel("Rolle in E2E Rollenclub ändern").click();
    await expect(dialog.getByRole("heading", { name: "Rolle ändern" })).toBeVisible();
    const speichern = dialog.getByRole("button", { name: "Speichern" });
    await expect(speichern).toBeDisabled();
    await dialog.locator('select[name="rolle"]').selectOption({ label: "Mitglied" });
    await expect(speichern).toBeEnabled();
    await speichern.click();
    await expect(rolle.getByText("Mitglied", { exact: true })).toBeVisible();

    // Entziehen: Papierkorb → Bestätigung → Zeile weg.
    await rolle.getByLabel("Rolle in E2E Rollenclub entfernen").click();
    await rolle.getByRole("button", { name: "Ja, entfernen" }).click();
    await expect(nutzer.locator("li", { hasText: "E2E Rollenclub" })).toHaveCount(0);
  });

  test("letzter Owner und eigene globale Rolle sind ausgegraut", async ({ page }) => {
    await loginAs(page, USERS.admin);
    await page.goto("/admin");

    // Der einzige Owner des Testclubs darf nicht entzogen werden.
    const owner = page.locator("li", { hasText: USERS.owner });
    const ownerTrash = owner
      .locator("li", { hasText: "E2E Rollenclub" })
      .getByLabel("Rolle in E2E Rollenclub entfernen");
    await expect(ownerTrash).toBeDisabled();
    await expect(ownerTrash).toHaveAttribute(
      "title",
      "Ein Club braucht mindestens einen Owner",
    );

    // Die eigene Super-Admin-Rolle: kein Stift, Papierkorb gesperrt.
    const ich = page.locator("li", { hasText: USERS.admin });
    const plattform = ich.locator("li", { hasText: "Plattform" });
    await expect(plattform.getByText("Super-Admin", { exact: true })).toBeVisible();
    await expect(plattform.getByLabel("Rolle in Plattform ändern")).toHaveCount(0);
    await expect(plattform.getByLabel("Rolle in Plattform entfernen")).toBeDisabled();
  });
});
