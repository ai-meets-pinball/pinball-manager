import { expect, test } from "@playwright/test";
import { createInvitation, sql, userIdByEmail } from "./helpers/db";
import { BASE_URL, TEST_PASSWORD, USERS } from "./helpers/auth";

/*
  Registrierung ist nur mit Einladung möglich.

  Der erste Test ist die Regression zum schwerwiegendsten Fund des
  Security-Reviews: früher genügte es, eine EINGELADENE ADRESSE zu kennen —
  der Token wurde nie geprüft. Wer die Adresse erriet, übernahm das Konto und
  konnte anschließend die Einladung annehmen.
*/

test.describe("Registrierung", () => {
  test("Fremdregistrierung einer eingeladenen Adresse ohne Token scheitert", async ({
    request,
  }) => {
    const opfer = "e2e-opfer@e2e.local";
    await createInvitation({
      email: opfer,
      invitedBy: await userIdByEmail(USERS.admin),
    });

    const res = await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
      data: { email: opfer, password: TEST_PASSWORD, name: "Angreifer" },
      headers: { origin: BASE_URL },
    });

    expect(res.status(), "Sign-up ohne Token muss abgelehnt werden").toBe(403);

    const konten = await sql`SELECT id FROM "user" WHERE email = ${opfer}`;
    expect(konten.length, "es darf kein Konto entstanden sein").toBe(0);

    await sql`DELETE FROM invitations WHERE email = ${opfer}`;
  });

  test("Registrierung ohne jede Einladung scheitert", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
      data: {
        email: "e2e-niemand@e2e.local",
        password: TEST_PASSWORD,
        name: "Niemand",
      },
      headers: { origin: BASE_URL },
    });
    expect(res.status()).toBe(403);
  });

  test("Registrierung mit gültigem Token gelingt und löst die Einladung ein", async ({
    page,
  }) => {
    const email = "e2e-neu@e2e.local";
    const token = await createInvitation({
      email,
      invitedBy: await userIdByEmail(USERS.admin),
    });

    await page.goto(`/register?invite=${token}`);
    await page.getByLabel("Name").fill("Neue Person");
    await page.getByLabel("E-Mail").fill(email);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('input[name="passwordConfirm"]').fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Registrieren" }).click();

    await page.waitForURL("**/machines");

    const [inv] = await sql`SELECT status FROM invitations WHERE token = ${token}`;
    expect(inv.status, "Einladung muss verbraucht sein").toBe("accepted");

    await sql`DELETE FROM "user" WHERE email = ${email}`;
    await sql`DELETE FROM invitations WHERE email = ${email}`;
  });

  test("Token einer anderen Adresse lässt sich nicht umwidmen", async ({ page }) => {
    const eingeladen = "e2e-eingeladen@e2e.local";
    const token = await createInvitation({
      email: eingeladen,
      invitedBy: await userIdByEmail(USERS.admin),
    });

    await page.goto(`/register?invite=${token}`);
    await page.getByLabel("Name").fill("Fremd");
    // Andere Adresse als die eingeladene:
    await page.getByLabel("E-Mail").fill("e2e-fremd@e2e.local");
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('input[name="passwordConfirm"]').fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Registrieren" }).click();

    await expect(page.getByText(/für eine andere Adresse|ungültig/i)).toBeVisible();
    const konten = await sql`SELECT id FROM "user" WHERE email = 'e2e-fremd@e2e.local'`;
    expect(konten.length).toBe(0);

    await sql`DELETE FROM invitations WHERE email = ${eingeladen}`;
  });

  test("Passwort-Policy greift serverseitig", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
      data: { email: USERS.outsider, password: "schwach", name: "X" },
      headers: { origin: BASE_URL },
    });
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain("Passwort");
  });
});
