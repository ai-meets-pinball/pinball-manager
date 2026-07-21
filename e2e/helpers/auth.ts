import type { APIRequestContext, Page } from "@playwright/test";
import { createInvitation, sql, userIdByEmail } from "./db";

/*
  Anmeldung in Tests — OHNE Bypass.

  Die Konten werden über den regulären Weg erzeugt: Einladung anlegen, sie wie
  registerAccount() auf `claiming` setzen, dann den echten Sign-up-Endpunkt
  aufrufen. Angemeldet wird über den echten Login-Endpunkt. Dadurch prüfen die
  Tests dieselbe Auth- und Rechtelogik, die auch produktiv läuft — ein
  Test-Bypass würde genau daran vorbeitesten.
*/

export const TEST_PASSWORD = "E2ePassw0rd";

/** Better Auth lehnt Requests ohne passenden Origin ab (CSRF-Schutz). */
export const BASE_URL = `http://localhost:${process.env.E2E_PORT ?? 3101}`;

export const USERS = {
  admin: "e2e-admin@e2e.local", // in SUPER_ADMIN_EMAILS → Bootstrap
  owner: "e2e-owner@e2e.local",
  member: "e2e-member@e2e.local",
  outsider: "e2e-outsider@e2e.local",
  supporter: "e2e-supporter@e2e.local", // globale Nur-Lese-Rolle
} as const;

/** Weist einem Testnutzer eine globale Rolle zu (clubId = NULL). */
export async function grantGlobalRole(email: string, roleKey: string) {
  const [{ id: userId }] = await sql`SELECT id FROM "user" WHERE email=${email}`;
  const [{ id: roleId }] = await sql`SELECT id FROM roles WHERE key=${roleKey}`;
  await sql`INSERT INTO role_assignments (user_id, role_id, club_id)
            VALUES (${userId}, ${roleId}, NULL) ON CONFLICT DO NOTHING`;
}

/** Konto über den echten Sign-up-Endpunkt anlegen.
    Der erste Nutzer nutzt den Bootstrap (leere Nutzertabelle + Allowlist),
    alle weiteren brauchen eine Einladung — wie in echt. */
export async function createAccount(
  request: APIRequestContext,
  email: string,
  name = email,
) {
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM "user"`;

  if (n > 0) {
    // Einladung anlegen und beanspruchen (das tut sonst registerAccount).
    const einlader = (await sql`SELECT id FROM "user" LIMIT 1`)[0].id;
    const token = await createInvitation({ email, invitedBy: einlader });
    await sql`UPDATE invitations SET status='claiming' WHERE token=${token}`;
  }

  const res = await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
    data: { email, password: TEST_PASSWORD, name },
    headers: { origin: BASE_URL },
  });
  if (!res.ok()) {
    throw new Error(`Konto ${email} konnte nicht angelegt werden: ${res.status()} ${await res.text()}`);
  }
  await sql`UPDATE invitations SET status='accepted' WHERE email=${email} AND status='claiming'`;
  return userIdByEmail(email);
}

/** Über die echte Anmeldemaske einloggen (setzt die Session-Cookies der Page). */
export async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL("**/machines");
}
