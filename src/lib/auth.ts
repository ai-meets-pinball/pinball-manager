import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/auth-schema";

/*
  Better-Auth-Serverkonfiguration — bewusst sichtbar und lesbar (PRD §7).

  Wichtig: Die Autorisierung (wer darf welche Maschine sehen/ändern) passiert NICHT hier
  und auch nicht in der Datenbank (kein RLS), sondern in der App-Schicht — siehe lib/session.ts.
*/
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
  },
  // nextCookies muss als letztes Plugin stehen, damit Server Actions Cookies setzen können.
  plugins: [nextCookies()],
});
