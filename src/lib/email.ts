import { Resend } from "resend";

/*
  E-Mail-Versand über Resend. Bislang nur für „Passwort vergessen".

  RESEND_API_KEY und EMAIL_FROM kommen aus der Umgebung. Der Client wird erst
  beim Senden erzeugt, damit ein fehlender Key nicht schon beim Import knallt.
*/

const FROM = process.env.EMAIL_FROM ?? "Pinball Manager <onboarding@resend.dev>";

export async function sendResetPasswordEmail(to: string, url: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY ist nicht gesetzt");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Passwort zurücksetzen — Pinball Manager",
    html: `
      <div style="font-family: sans-serif; line-height: 1.5;">
        <h2>Passwort zurücksetzen</h2>
        <p>Du hast angefragt, dein Passwort zurückzusetzen. Klicke auf den Link,
           um ein neues Passwort zu vergeben:</p>
        <p>
          <a href="${url}"
             style="display:inline-block;padding:10px 18px;background:#dc2626;
                    color:#fff;text-decoration:none;border-radius:8px;">
            Passwort zurücksetzen
          </a>
        </p>
        <p style="color:#71717a;font-size:13px;">
          Wenn du das nicht warst, kannst du diese E-Mail ignorieren.
          Der Link ist nur begrenzt gültig.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`E-Mail-Versand fehlgeschlagen: ${error.message}`);
  }
}

/** Bestätigung eines E-Mail-Wechsels. Der Link geht an die BISHERIGE Adresse,
    damit ein fremder Zugriff die Adresse nicht still übernehmen kann. */
export async function sendChangeEmailVerification(
  to: string,
  newEmail: string,
  url: string,
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY ist nicht gesetzt");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "E-Mail-Adresse ändern — Pinball Manager",
    html: `
      <div style="font-family: sans-serif; line-height: 1.5;">
        <h2>E-Mail-Adresse ändern</h2>
        <p>Es wurde beantragt, deine Adresse auf <strong>${newEmail}</strong> zu ändern.
           Bestätige die Änderung mit diesem Link:</p>
        <p>
          <a href="${url}"
             style="display:inline-block;padding:10px 18px;background:#7a1f2b;
                    color:#fff;text-decoration:none;border-radius:8px;">
            Änderung bestätigen
          </a>
        </p>
        <p style="color:#71717a;font-size:13px;">
          Wenn du das nicht warst, ignoriere diese E-Mail — es ändert sich dann nichts.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`E-Mail-Versand fehlgeschlagen: ${error.message}`);
  }
}

export async function sendInvitationEmail(
  to: string,
  url: string,
  clubName: string,
  inviterName: string,
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY ist nicht gesetzt");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Einladung zum Club „${clubName}" — Pinball Manager`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.5;">
        <h2>Einladung zu „${clubName}"</h2>
        <p>${inviterName} lädt dich ein, dem Club <strong>${clubName}</strong>
           bei Pinball Manager beizutreten.</p>
        <p>
          <a href="${url}"
             style="display:inline-block;padding:10px 18px;background:#7a1f2b;
                    color:#fff;text-decoration:none;border-radius:8px;">
            Einladung ansehen
          </a>
        </p>
        <p style="color:#71717a;font-size:13px;">
          Hast du noch kein Konto, kannst du dich über den Link direkt registrieren.
          Der Link ist nur begrenzt gültig.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`E-Mail-Versand fehlgeschlagen: ${error.message}`);
  }
}
