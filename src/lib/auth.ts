import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/auth-schema";
import {
  sendChangeEmailVerification,
  sendResetPasswordEmail,
} from "@/lib/email";
import { PASSWORD_MIN, validatePassword } from "@/lib/validators";

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
  // Globale Rollen liegen bewusst NICHT am user-Datensatz, sondern in
  // role_assignments (siehe lib/session.ts) — ein Modell für globale und Club-Rollen.
  user: {
    changeEmail: {
      enabled: true,
      // Bei verifizierter Adresse verlangt Better Auth eine Bestätigung; der Link
      // geht an die BISHERIGE Adresse (Schutz vor stiller Übernahme).
      sendChangeEmailVerification: async ({
        user,
        newEmail,
        url,
      }: {
        user: { email: string };
        newEmail: string;
        url: string;
      }) => {
        await sendChangeEmailVerification(user.email, newEmail, url);
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    // Offene Selbstregistrierung (zusätzlich gibt es den Einladungsfluss).
    disableSignUp: false,
    minPasswordLength: PASSWORD_MIN,
    maxPasswordLength: 128,
    // Better Auth erzeugt Token + Link; wir verschicken ihn per Resend.
    // `url` führt über Better Auth zurück auf /reset-password?token=…
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url);
    },
  },
  // Passwort-Policy serverseitig erzwingen — dieselbe validatePassword() wie im Client.
  // Greift bei Sign-up und Passwort-Reset (Länge prüft Better Auth zusätzlich selbst).
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const pwPaths = ["/sign-up/email", "/reset-password"];
      if (!pwPaths.includes(ctx.path)) return;
      const pw = ctx.body?.password ?? ctx.body?.newPassword;
      const problem = validatePassword(pw);
      if (problem) {
        throw new APIError("BAD_REQUEST", { message: problem });
      }
    }),
  },
  // nextCookies muss als letztes Plugin stehen, damit Server Actions Cookies setzen können.
  plugins: [nextCookies()],
});
