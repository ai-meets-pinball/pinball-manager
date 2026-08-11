import {
  eq,
} from "drizzle-orm";
import { db } from "@/db";
import {
  clubSettings,
  emailTemplates,
  userSettings,
} from "@/db/schema";
import { SHARE_DEFAULTS, type ShareDefaults } from "@/lib/share-defaults";
import {
  DEFAULT_TEMPLATES,
  type ResolvedTemplate,
  type TemplateKey,
} from "@/lib/email-templates";

/* Einstellungen und E-Mail-Vorlagen. */

/** E-Mail-Vorlage laden: DB-Eintrag falls angepasst, sonst der Standard aus dem
    Code. Liegt hier (Server-Seite), damit lib/email-templates.ts client-safe
    bleibt — sonst landet der Postgres-Treiber im Client-Bundle. */
export async function getTemplate(
  key: TemplateKey,
): Promise<ResolvedTemplate> {
  const row = await db.query.emailTemplates.findFirst({
    where: eq(emailTemplates.key, key),
  });
  if (row) return { subject: row.subject, body: row.body, angepasst: true };
  const std = DEFAULT_TEMPLATES[key];
  return { subject: std.subject, body: std.body, angepasst: false };
}

/** Gespeicherte Einstellungen eines Nutzers bzw. Clubs (oder der Standard). */
export async function getSettingsFor(
  art: "user" | "club",
  id: string,
): Promise<{ werte: ShareDefaults; angepasst: boolean }> {
  const row =
    art === "user"
      ? await db.query.userSettings.findFirst({
          where: eq(userSettings.userId, id),
        })
      : await db.query.clubSettings.findFirst({
          where: eq(clubSettings.clubId, id),
        });
  if (!row) return { werte: SHARE_DEFAULTS, angepasst: false };
  return {
    werte: {
      defaultScope: row.defaultScope as ShareDefaults["defaultScope"],
      defaultAnonym: row.defaultAnonym,
      defaultZeigeKosten: row.defaultZeigeKosten,
      autoShareFacts: row.autoShareFacts,
      autoShareRepairs: row.autoShareRepairs,
    },
    angepasst: true,
  };
}
