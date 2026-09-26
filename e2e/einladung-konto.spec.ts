import { expect, test } from "@playwright/test";
import { createClub, createInvitation, sql, userIdByEmail } from "./helpers/db";
import { TEST_PASSWORD, USERS } from "./helpers/auth";

/*
  Club-Einladung an eine Adresse, die SCHON ein Konto hat (Redline 09/2026:
  „bestehendes Konto weiterverwenden"): die Landeseite bietet Anmelden statt
  Registrieren, führt nach dem Login zurück auf die Einladung, und Annehmen
  macht das vorhandene Konto zum Mitglied — es entsteht kein zweites Konto.
*/
test.describe("Einladung an bestehendes Konto", () => {
  let clubId: string;
  let token: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    clubId = await createClub("E2E Einladungsclub", ownerId);
    token = await createInvitation({
      email: USERS.outsider,
      invitedBy: ownerId,
      clubId,
      roleKey: "member",
    });
  });

  test.afterAll(async () => {
    await sql`DELETE FROM invitations WHERE token = ${token}`;
    await sql`DELETE FROM clubs WHERE id = ${clubId}`;
  });

  test("Anmelden & beitreten statt Registrieren, danach Mitglied", async ({
    page,
  }) => {
    await page.goto(`/invite/${token}`);
    await expect(page.getByText(/schon ein Konto/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrieren & beitreten" })).toHaveCount(0);
    await page.getByRole("button", { name: "Anmelden & beitreten" }).click();

    await expect(page).toHaveURL(/\/login\?von=/);
    await page.getByLabel("E-Mail").fill(USERS.outsider);
    await page.getByLabel("Passwort", { exact: true }).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Anmelden" }).click();

    // Zurück auf der Einladung, angemeldet mit dem passenden Konto.
    await expect(page).toHaveURL(new RegExp(`/invite/${token}`));
    await page.getByRole("button", { name: "Einladung annehmen" }).click();
    await expect(page).toHaveURL(new RegExp(`/clubs/${clubId}`));

    const outsiderId = await userIdByEmail(USERS.outsider);
    const [rolle] = await sql`
      SELECT r.key FROM role_assignments a JOIN roles r ON r.id = a.role_id
      WHERE a.user_id = ${outsiderId} AND a.club_id = ${clubId}`;
    expect(rolle?.key).toBe("member");
    const konten = await sql`SELECT count(*)::int n FROM "user" WHERE email = ${USERS.outsider}`;
    expect(konten[0].n, "kein zweites Konto").toBe(1);
  });
});
