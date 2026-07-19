import { request } from "@playwright/test";
import { cleanupTestData, sql } from "./helpers/db";
import { BASE_URL, createAccount, USERS } from "./helpers/auth";

/*
  Einmaliges Setup vor der Suite:
  1. Reste eines früheren Laufs entfernen (nur e2e-Namensraum).
  2. Prüfen, dass die Migrationen auf der Test-DB liegen — sonst schlagen alle
     Tests mit kryptischen SQL-Fehlern fehl statt mit einer klaren Meldung.
  3. Die vier Testkonten über den regulären Sign-up-Pfad anlegen.
*/
export default async function globalSetup() {
  const rollen = await sql`SELECT count(*)::int AS n FROM roles`.catch(() => null);
  if (!rollen) {
    throw new Error(
      "Die Test-Datenbank hat kein Schema. Erst Migrationen einspielen:\n" +
        '  DATABASE_URL="$E2E_DATABASE_URL" npm run db:migrate',
    );
  }
  if (rollen[0].n === 0) {
    throw new Error(
      "Der roles-Katalog ist leer — Migration 0004 fehlt auf der Test-DB.",
    );
  }

  await cleanupTestData();

  const ctx = await request.newContext({ baseURL: BASE_URL });
  try {
    // Reihenfolge zählt: der erste ist der Bootstrap-Super-Admin,
    // alle weiteren werden von ihm eingeladen.
    for (const email of [
      USERS.admin,
      USERS.owner,
      USERS.member,
      USERS.outsider,
    ]) {
      await createAccount(ctx, email);
    }
  } finally {
    await ctx.dispose();
  }
}
