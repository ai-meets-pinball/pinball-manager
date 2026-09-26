import { expect, test } from "@playwright/test";
import { addMember, createClub, createMachine, sql, userIdByEmail } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Besitzer-Katalog eines Clubs (Feedback 09/2026, „Besitzer und Mitglieder
  gedoppelt"): Owner/Admins pflegen die Einträge auf der Club-Seite —
  umbenennen, Dubletten zusammenführen (Maschinen wandern mit), löschen nur
  ohne Maschinen. Im Maschinen-Formular erscheint jede Person genau einmal.
*/
test.describe("Club: Besitzer-Katalog", () => {
  let clubId: string;
  let machineId: string;
  let machine2Id: string;
  let memberName: string;
  let verknuepftId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    const memberId = await userIdByEmail(USERS.member);
    clubId = await createClub("E2E Besitzerclub", ownerId);
    await addMember(clubId, memberId, "member");
    ({ machineId } = await createMachine({ ownerId, clubId, opdbRef: "E2E-BES1" }));
    ({ machineId: machine2Id } = await createMachine({ ownerId, clubId, opdbRef: "E2E-BES2" }));
    memberName = (await sql`SELECT name FROM "user" WHERE id = ${memberId}`)[0].name as string;
    // Verknüpfter Eintrag (Kopie des Mitgliedsnamens) und eine Dublette ohne Konto
    // an der ersten Maschine — genau die Lage aus dem Feedback.
    [{ id: verknuepftId }] = await sql`
      INSERT INTO machine_besitzer (name, club_id, created_by, user_id)
      VALUES (${memberName}, ${clubId}, ${ownerId}, ${memberId}) RETURNING id`;
    const [dublette] = await sql`
      INSERT INTO machine_besitzer (name, club_id, created_by)
      VALUES ('E2E Dublette', ${clubId}, ${ownerId}) RETURNING id`;
    await sql`INSERT INTO machine_besitzer_zuordnung (machine_id, besitzer_id)
              VALUES (${machineId}, ${dublette.id})`;
  });

  test.afterAll(async () => {
    await sql`DELETE FROM machines WHERE id IN (${machineId}, ${machine2Id})`;
    await sql`DELETE FROM machine_besitzer WHERE club_id = ${clubId}`;
    await sql`DELETE FROM role_assignments WHERE club_id = ${clubId}`;
    await sql`DELETE FROM clubs WHERE id = ${clubId}`;
  });

  test("umbenennen, zusammenführen, löschen", async ({ page }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/clubs/${clubId}`);
    await expect(page.getByRole("heading", { name: "Besitzer", exact: true })).toBeVisible();

    // Umbenennen
    await page.getByRole("button", { name: "Besitzer E2E Dublette bearbeiten" }).click();
    const dialog = page.locator("dialog[open]");
    await dialog.getByLabel("Name", { exact: true }).fill("E2E Dublette neu");
    await dialog.getByRole("button", { name: "Speichern" }).click();
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    const zeileNeu = page.getByRole("listitem").filter({ hasText: "E2E Dublette neu" });
    await expect(zeileNeu).toBeVisible();

    // Löschen ist gesperrt, solange Maschinen dranhängen.
    await expect(
      page.getByRole("button", { name: "Besitzer E2E Dublette neu löschen" }),
    ).toBeDisabled();

    // Zusammenführen in den verknüpften Eintrag: Maschine wandert mit.
    await page.getByRole("button", { name: "Besitzer E2E Dublette neu bearbeiten" }).click();
    await page.locator("dialog[open]").getByLabel("Zusammenführen mit").selectOption(verknuepftId);
    await page.locator("dialog[open]").getByRole("button", { name: "Zusammenführen" }).click();
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await expect(zeileNeu).toHaveCount(0);
    const abschnitt = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Besitzer", exact: true }) });
    const zeile = abschnitt.getByRole("listitem").filter({ hasText: memberName });
    await expect(zeile).toContainText("1 Maschine");
    await expect(zeile).toContainText("Mitglied");

    // Ohne Maschinen lässt sich ein Eintrag löschen.
    await sql`INSERT INTO machine_besitzer (name, club_id, created_by)
              VALUES ('E2E Frei', ${clubId}, ${await userIdByEmail(USERS.owner)})`;
    await page.reload();
    await page.getByRole("button", { name: "Besitzer E2E Frei löschen" }).click();
    await page.getByRole("button", { name: "Ja, löschen" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "E2E Frei" })).toHaveCount(0);
  });

  test("Maschinen-Formular zeigt das Mitglied genau einmal", async ({ page }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machine2Id}/edit`);
    const optionen = page.locator("option", { hasText: memberName });
    await expect(optionen).toHaveCount(1);
  });
});
