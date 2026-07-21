import { Resend } from "resend";
import { getTemplate } from "@/db/queries";
import { escapeHtml, renderPlaceholders, textToHtml } from "@/lib/email-templates";

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

/** Adressbestätigung (Better Auth `emailVerification.sendVerificationEmail`).
    Wird u. a. nach einem bestätigten E-Mail-Wechsel für die neue Adresse genutzt. */
export async function sendVerifyEmail(to: string, url: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY ist nicht gesetzt");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "E-Mail-Adresse bestätigen — Pinball Manager",
    html: `
      <div style="font-family: sans-serif; line-height: 1.5;">
        <h2>E-Mail-Adresse bestätigen</h2>
        <p>Bitte bestätige diese Adresse für dein Pinball-Manager-Konto:</p>
        <p>
          <a href="${url}"
             style="display:inline-block;padding:10px 18px;background:#7a1f2b;
                    color:#fff;text-decoration:none;border-radius:8px;">
            Adresse bestätigen
          </a>
        </p>
        <p style="color:#71717a;font-size:13px;">
          Wenn du das nicht warst, kannst du diese E-Mail ignorieren.
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

/*
  Einladungsmails werden aus einer Vorlage gebaut (lib/email-templates.ts):
  Betreff + Einleitung sind im Admin editierbar, der CTA-Button mit dem Link
  und der Gültigkeitshinweis stehen FEST hier — so kann eine bearbeitete
  Vorlage den Einladungslink nicht entfernen.
*/
function invitationHtml({
  body,
  url,
  ctaLabel,
  hinweis,
  message,
}: {
  body: string;
  url: string;
  ctaLabel: string;
  hinweis: string;
  message?: string | null;
}) {
  // Persönliche Nachricht als zitierter Block — escaped, kein rohes HTML.
  const persoenlich = message?.trim()
    ? `<div style="margin:16px 0;padding:12px 14px;border-left:3px solid #7a1f2b;
                  background:#f6f4f2;color:#333;">${textToHtml(message.trim())}</div>`
    : "";

  return `
      <div style="font-family: sans-serif; line-height: 1.5;">
        ${textToHtml(body)}
        ${persoenlich}
        <p>
          <a href="${url}"
             style="display:inline-block;padding:10px 18px;background:#7a1f2b;
                    color:#fff;text-decoration:none;border-radius:8px;">
            ${ctaLabel}
          </a>
        </p>
        <p style="color:#71717a;font-size:13px;">${hinweis}</p>
      </div>
    `;
}

/** Wartungs-Erinnerung: Digest der fälligen Wartungen je Gerät an den Eigentümer.
    Wird vom täglichen Cron (app/api/cron/maintenance-reminders) verschickt. */
export async function sendMaintenanceReminderEmail(
  to: string,
  geraete: { geraet: string; id: string; punkte: string[] }[],
  baseUrl: string,
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY ist nicht gesetzt");

  const gesamt = geraete.reduce((n, g) => n + g.punkte.length, 0);
  const bloecke = geraete
    .map(
      (g) => `
        <p style="margin:14px 0 4px;font-weight:600;">
          ${escapeHtml(g.geraet)}${
            baseUrl
              ? ` — <a href="${baseUrl}/machines/${g.id}">Wartungsplan öffnen</a>`
              : ""
          }
        </p>
        <ul style="margin:0 0 0 18px;padding:0;color:#333;">
          ${g.punkte.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}
        </ul>`,
    )
    .join("");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `${gesamt} fällige Wartung${gesamt === 1 ? "" : "en"} — Pinball Manager`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.5;">
        <h2>Fällige Wartungen</h2>
        <p>Für diese Geräte stehen Wartungen an:</p>
        ${bloecke}
        <p style="color:#71717a;font-size:13px;margin-top:16px;">
          Trag die erledigten Punkte im Wartungsplan des jeweiligen Geräts ein —
          dann verschiebt sich die nächste Fälligkeit automatisch.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`E-Mail-Versand fehlgeschlagen: ${error.message}`);
  }
}

/** Plattform-Einladung (ohne Club): berechtigt zur Registrierung. */
export async function sendPlatformInvitationEmail(
  to: string,
  url: string,
  inviterName: string,
  message?: string | null,
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY ist nicht gesetzt");

  const vorlage = await getTemplate("invite_platform");
  const vars = { einlader: inviterName };

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: renderPlaceholders(vorlage.subject, vars),
    html: invitationHtml({
      body: renderPlaceholders(vorlage.body, vars),
      url,
      ctaLabel: "Konto erstellen",
      hinweis:
        "Eine Registrierung ist nur über diesen Link möglich. Er ist begrenzt gültig und gilt ausschließlich für diese E-Mail-Adresse.",
      message,
    }),
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
  message?: string | null,
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY ist nicht gesetzt");

  const vorlage = await getTemplate("invite_club");
  const vars = { einlader: inviterName, clubname: clubName };

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: renderPlaceholders(vorlage.subject, vars),
    html: invitationHtml({
      body: renderPlaceholders(vorlage.body, vars),
      url,
      ctaLabel: "Einladung ansehen",
      hinweis:
        "Hast du noch kein Konto, kannst du dich über den Link direkt registrieren. Der Link ist nur begrenzt gültig.",
      message,
    }),
  });

  if (error) {
    throw new Error(`E-Mail-Versand fehlgeschlagen: ${error.message}`);
  }
}
