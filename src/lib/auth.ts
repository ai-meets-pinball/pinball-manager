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
    Offene Registrierung, Anmeldung erst nach bestätigter Adresse.

    Der Nachweis „das Postfach gehört dir" kommt auf zwei Wegen:
    - Einladung: der TOKEN stand nur in der Einladungs-Mail → das Konto wird
      sofort als bestätigt angelegt (databaseHooks unten), keine zweite Mail.
    - Selbstregistrierung: Better Auth schickt den Bestätigungslink direkt nach
      dem Sign-up (`sendOnSignUp`) und bei jedem Anmeldeversuch eines noch
      unbestätigten Kontos erneut (`sendOnSignIn`) — so kommt auch wieder rein,
      wessen Link abgelaufen ist. Nach dem Klick ist die Person angemeldet
      (`autoSignInAfterVerification`) und landet auf der callbackURL.

    Bestehende Konten wurden per Migration 0056 als bestätigt markiert — sie
    kamen alle über einen Einladungs-Token.
  */
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }, request) => {
      /*
        Sign-up einer Eingeladenen (oder Bootstrap): die Adresse ist schon
        bestätigt, keine Mail. Erkennbar am Pfad — bzw. am FEHLENDEN Request,
        denn registerAccount() ruft auth.api.signUpEmail() serverseitig ohne
        HTTP-Request auf. Beim E-Mail-Wechsel dagegen (GET /verify-email nach
        Bestätigung der alten Adresse) übergibt Better Auth den bestätigten
        Nutzer mit der NEUEN Adresse — dort muss der Link raus.
      */
      const pfad = request ? new URL(request.url).pathname : null;
      const istSignUp = pfad === null || pfad.endsWith("/sign-up/email");
      if (user.emailVerified && istSignUp) return;
      await sendVerifyEmail(user.email, url);
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (neu) => {
          const email = neu.email.trim().toLowerCase();
          const [{ anzahl }] = await db.select({ anzahl: count() }).from(user);
          // Bootstrap: die erste Adresse aus SUPER_ADMIN_EMAILS auf einer
          // leeren Installation — dort kann niemand einladen oder mailen.
          const istBootstrap = anzahl === 0 && istSuperAdminEmail(email);
          // Einladung: registerAccount() hat den Token geprüft und die
          // Einladung auf `claiming` gesetzt — nur dann gilt sie als eingelöst.
          const eingeloest = await db.query.invitations.findFirst({
            where: and(
              eq(invitations.email, email),
              eq(invitations.status, "claiming"),
              gt(invitations.expiresAt, new Date()),
            ),
          });
          if (istBootstrap || eingeloest) {
            return { data: { ...neu, emailVerified: true } };
          }

          /* Zugang läuft über eine EINLADUNG (Entscheidung 2026-09-11). Die
             Sperre sitzt hier und nicht in `emailAndPassword.disableSignUp`:
             jener Schalter prüft im Endpunkt-Handler, den der Einladungsfluss
             über auth.api.signUpEmail() SELBST aufruft — er würde also auch
             Einladungen töten. Dieser Hook läuft dagegen bei JEDER Konto-
             Anlage, also auch am rohen POST /api/auth/sign-up/email. */
          throw new APIError("BAD_REQUEST", {
            message:
              "Der Zugang läuft derzeit über eine Einladung. Bitte frg@silverballmania.com anschreiben.",
            code: "INVITATION_REQUIRED",
          });
        },
      },
    },
  },
  // Offener Sign-up braucht eine Bremse gegen Massenanmeldungen. Better Auth
  // limitiert in Produktion standardmäßig (10 s / 100 Anfragen je IP); hier
  // enger für die beiden Endpunkte, die Konten anlegen bzw. Mails auslösen.
  // In der Entwicklung (und damit in der E2E-Suite) ist das Limit aus.
  rateLimit: {
    customRules: {
      "/sign-up/email": { window: 60, max: 5 },
      "/send-verification-email": { window: 60, max: 3 },
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
    /* MUSS false bleiben: auth.api.signUpEmail() aus registerAccount() läuft
       durch denselben Endpunkt-Handler, den dieser Schalter sperrt — true
       würde also den Einladungsfluss mit abschalten. Die eigentliche Sperre
       („nur mit Einladung") sitzt im databaseHook oben. */
    disableSignUp: false,
    // Anmelden erst mit bestätigter Adresse — siehe emailVerification oben.
    requireEmailVerification: true,
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
      // Passwort-Policy serverseitig erzwingen — dieselbe validatePassword()
      // wie im Client. Greift bei Sign-up und Passwort-Reset.
      const pwPaths = ["/sign-up/email", "/reset-password"];
      if (pwPaths.includes(ctx.path)) {
        const pw = ctx.body?.password ?? ctx.body?.newPassword;
        const problem = validatePassword(pw);
        if (problem) throw new APIError("BAD_REQUEST", { message: problem });
      }
      /*
        Frühere Grenze „Sign-up nur mit eingelöster Einladung" ist weg: Wer eine
        fremde Adresse registriert, bekommt jetzt ein UNBESTÄTIGTES Konto, mit
        dem sich nichts anfangen lässt — weder anmelden noch eine Einladung
        annehmen. Die Inhaberin der Adresse kommt über „Passwort vergessen"
        + Bestätigungslink an ihr Konto.
      */
    }),
  },
  // nextCookies muss als letztes Plugin stehen, damit Server Actions Cookies setzen können.
  plugins: [nextCookies()],
});
