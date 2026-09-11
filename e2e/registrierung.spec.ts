import { expect, test, type APIRequestContext } from "@playwright/test";
import { createInvitation, sql, userIdByEmail } from "./helpers/db";
import { BASE_URL, TEST_PASSWORD, USERS } from "./helpers/auth";

/*
  Zugang NUR mit Einladung (Entscheidung 2026-09-11). Die Sperre sitzt im
  databaseHook in lib/auth.ts, damit sie auch am rohen Endpunkt greift und
  nicht nur in der Server Action — diese Tests sind ihr Sicherheitsnetz.

  Der erste Test ist die Regression zum schwerwiegendsten Fund des
  Security-Reviews: früher genügte es, eine EINGELADENE ADRESSE zu kennen —
  der Token wurde nie geprüft. Wer die Adresse erriet, übernahm das Konto und
  konnte anschließend die Einladung annehmen. Heute entsteht dabei nur ein
  unbestätigtes Konto ohne Club, und die Einladung bleibt offen.
*/

async function signUp(request: APIRequestContext, email: string, name = "Jemand") {
  return request.post(`${BASE_URL}/api/auth/sign-up/email`, {
    data: { email, password: TEST_PASSWORD, name },
    headers: { origin: BASE_URL },
  });
}

async function signIn(request: APIRequestContext, email: string) {
  return request.post(`${BASE_URL}/api/auth/sign-in/email`, {
    data: { email, password: TEST_PASSWORD },
    headers: { origin: BASE_URL },
  });
}

test.describe("Registrierung", () => {
  test("Fremdregistrierung einer eingeladenen Adresse ohne Token legt kein Konto an und löst die Einladung nicht ein", async ({
    request,
  }) => {
    const opfer = "e2e-opfer@e2e.local";
    const token = await createInvitation({
      email: opfer,
      invitedBy: await userIdByEmail(USERS.admin),
    });

    // Die Einladung liegt auf `pending` — der Token stand nur in der Mail.
    // Wer bloß die ADRESSE kennt, darf damit nichts anfangen können.
    const res = await signUp(request, opfer, "Angreifer");
    expect(res.ok(), "ohne Einladung entsteht kein Konto").toBe(false);

    const konten = await sql`SELECT id FROM "user" WHERE email = ${opfer}`;
    expect(konten.length, "kein Konto auf die fremde Adresse").toBe(0);

    const login = await signIn(request, opfer);
    expect(login.ok(), "es gibt nichts, womit man sich anmelden könnte").toBe(
      false,
    );

    const [inv] = await sql`SELECT status FROM invitations WHERE token = ${token}`;
    expect(inv.status, "die Einladung bleibt offen").toBe("pending");

    await sql`DELETE FROM invitations WHERE email = ${opfer}`;
  });

  test("Der rohe Sign-up-Endpunkt legt ohne Einladung kein Konto an", async ({
    request,
  }) => {
    const email = "e2e-offen@e2e.local";

    // Das ist der Weg AM Formular vorbei — genau den muss die Sperre decken.
    const res = await signUp(request, email, "Offen");
    expect(res.ok(), "Endpunkt muss ablehnen").toBe(false);

    const konten = await sql`SELECT id FROM "user" WHERE email = ${email}`;
    expect(konten.length, "kein Konto in der Datenbank").toBe(0);
  });

  test("Registrierung mit gültigem Token: sofort bestätigt, angemeldet, Einladung eingelöst", async ({
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

    const [konto] = await sql`SELECT email_verified FROM "user" WHERE email = ${email}`;
    expect(konto.email_verified, "der Token belegt das Postfach").toBe(true);
    const [inv] = await sql`SELECT status FROM invitations WHERE token = ${token}`;
    expect(inv.status, "Einladung muss verbraucht sein").toBe("accepted");

    await sql`DELETE FROM "user" WHERE email = ${email}`;
    await sql`DELETE FROM invitations WHERE email = ${email}`;
  });

  test("Ohne Einladungs-Token zeigt /register gar kein Formular", async ({
    page,
  }) => {
    await page.goto("/register");

    await expect(
      page.getByRole("heading", { name: "Zugang auf Einladung" }),
    ).toBeVisible();
    await expect(page.getByText(/offene Selbstregistrierung/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrieren" })).toHaveCount(
      0,
    );
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
