import { and, count, eq, gt } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/auth-schema";
import { invitations } from "@/db/schema";
import { istSuperAdminEmail } from "@/lib/super-admins";
import {
  sendChangeEmailVerification,
  sendResetPasswordEmail,
  sendVerifyEmail,
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
  /*
    E-Mail-Verifikation ist die Voraussetzung dafür, dass Better Auth den
    E-Mail-Wechsel überhaupt zulässt (siehe update-user-Route: ohne
    `emailVerification.sendVerificationEmail` wirft /change-email pauschal
    "Verification email isn't enabled").

    ACHTUNG: `requireEmailVerification` wird bewusst NICHT gesetzt — das würde
    bestehende Konten aussperren.
  */
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerifyEmail(user.email, url);
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      /*
        Bei verifizierter Adresse verlangt Better Auth eine Bestätigung. `user`
        ist hier die AKTUELLE Session, der Link geht also an die bisherige
        Adresse — Schutz davor, dass eine offene Sitzung das Konto still
        übernimmt. Die Parameter werden bewusst NICHT von Hand typisiert:
        eine falsch benannte Option fiele sonst wieder nicht auf.
      */
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
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
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // 1. Passwort-Policy serverseitig erzwingen — dieselbe validatePassword()
      //    wie im Client. Greift bei Sign-up und Passwort-Reset.
      const pwPaths = ["/sign-up/email", "/reset-password"];
      if (pwPaths.includes(ctx.path)) {
        const pw = ctx.body?.password ?? ctx.body?.newPassword;
        const problem = validatePassword(pw);
        if (problem) throw new APIError("BAD_REQUEST", { message: problem });
      }

      /*
        2. Registrierung NUR mit eingelöster Einladung.

        `disableSignUp: true` wäre hier falsch — es würde den Endpoint komplett
        sperren und damit auch Eingeladene aussperren. DAS hier ist die echte
        Grenze (lesbares TS, PRD §7).

        Wichtig: Es genügt NICHT zu prüfen, ob für die E-Mail eine Einladung
        existiert — wer eine eingeladene Adresse kennt, hätte sie sonst fremd
        registriert (es gibt keine E-Mail-Verifikation). Erlaubt ist Sign-up nur
        für Einladungen im Zustand `claiming`; dorthin bringt sie ausschließlich
        registerAccount() nach Prüfung des TOKENS aus der Einladungs-Mail.
      */
      if (ctx.path === "/sign-up/email") {
        const email = String(ctx.body?.email ?? "").trim().toLowerCase();

        // Bootstrap NUR auf einer leeren Installation: dort kann niemand
        // einladen. Danach braucht auch ein Super-Admin eine Einladung —
        // sonst wäre jede noch kontenlose Adresse aus SUPER_ADMIN_EMAILS
        // von Fremden registrierbar und damit sofort Super-Admin.
        const [{ anzahl }] = await db.select({ anzahl: count() }).from(user);
        if (anzahl === 0 && istSuperAdminEmail(email)) return;

        const eingeloest = await db.query.invitations.findFirst({
          where: and(
            eq(invitations.email, email),
            eq(invitations.status, "claiming"),
            gt(invitations.expiresAt, new Date()),
          ),
        });
        if (!eingeloest) {
          throw new APIError("FORBIDDEN", {
            message:
              "Registrierung ist nur mit Einladung möglich. Bitte nutze den Link aus deiner Einladungs-E-Mail.",
          });
        }
      }
    }),
  },
  // nextCookies muss als letztes Plugin stehen, damit Server Actions Cookies setzen können.
  plugins: [nextCookies()],
});
