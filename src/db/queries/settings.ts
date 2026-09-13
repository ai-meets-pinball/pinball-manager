import {
  eq,
} from "drizzle-orm";
import { db } from "@/db";
import {
  clubSettings,
  emailTemplates,
  userSettings,
} from "@/db/schema";
import { darfEigenenSchluessel, darfKi } from "@/lib/ki-zugang";
import type { RechteNutzer } from "@/lib/rechte";
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

/** Persönliches Logo eines Nutzers (oder null). Schema-Drift-fest wie
    getSettingsFor (siehe 1.06): eine fehlende Spalte kippt keine Seite. */
export async function getUserLogoUrl(userId: string): Promise<string | null> {
  try {
    const row = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
      columns: { logoUrl: true },
    });
    return row?.logoUrl ?? null;
  } catch (e) {
    console.error("[settings] Logo nicht ladbar:", e);
    return null;
  }
}

/** Gespeicherte Einstellungen eines Nutzers bzw. Clubs (oder der Standard). */
export async function getSettingsFor(
  art: "user" | "club",
  id: string,
): Promise<{ werte: ShareDefaults; angepasst: boolean }> {
  try {
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
  } catch (e) {
    // Robust gegen Schema-Drift (z. B. eine neue Spalte, deren Migration noch
    // nicht auf der DB ist): lieber die Standard-Voreinstellungen zurückgeben
    // als eine ganze Seite mit 500 kippen. Der Fehler bleibt im Server-Log.
    console.error("[settings] Einstellungen nicht ladbar, nutze Standard:", e);
    return { werte: SHARE_DEFAULTS, angepasst: false };
  }
}

/** KI in der App nutzen? Nur für den Super-Admin bedeutsam (lib/ki-zugang);
    fehlende Zeile = true. Schema-Drift-fest wie getSettingsFor. */
export async function getKiInDerApp(userId: string): Promise<boolean> {
  try {
    const row = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
      columns: { kiInDerApp: true },
    });
    return row?.kiInDerApp ?? true;
  } catch (e) {
    console.error("[settings] ki_in_der_app nicht ladbar, nutze true:", e);
    return true;
  }
}

/** Die KI-Regel für einen Nutzer an EINER Stelle ausgewertet — Einstellung
    laden, dann lib/ki-zugang je Zweck. Seiten und Actions fragen nur noch das. */
export async function getKiZugang(user: RechteNutzer & { id: string }) {
  const kiInDerApp = await getKiInDerApp(user.id);
  return {
    kiInDerApp,
    handbuch: darfKi(user, "handbuch", kiInDerApp),
    guide: darfKi(user, "guide", kiInDerApp),
    wartung: darfKi(user, "wartung", kiInDerApp),
    byo: darfEigenenSchluessel(user, kiInDerApp),
  };
}
