import { asc, eq, inArray, not, sql } from "drizzle-orm";
import { db } from "@/db";
import { feedback, user } from "@/db/schema";
import { sendFeedbackStatusEmail } from "@/lib/email";
import { sollBenachrichtigen } from "@/lib/feedback-status";
import { FEEDBACK_STATUS } from "@/lib/validators";

/*
  Kern der Feedback-Triage OHNE Gate — bewusst NICHT `"use server"` (Muster
  machine-status-core, siehe Security-Doc): der schreibende Aufrufer setzt das
  Recht davor. Genutzt von der Web-Action `updateFeedback` (Super-Admin-Gate)
  UND vom Terminal-CLI `scripts/feedback.ts` (vertrauenswürdig, hat DB-Zugang).
  Beide schreiben und benachrichtigen dadurch identisch.
*/
type FeedbackStatus = (typeof FEEDBACK_STATUS)[number];

const SPALTEN = {
  id: feedback.id,
  typ: feedback.typ,
  titel: feedback.titel,
  beschreibung: feedback.beschreibung,
  seite: feedback.seite,
  appVersion: feedback.appVersion,
  userAgent: feedback.userAgent,
  screenshotUrl: feedback.screenshotUrl,
  status: feedback.status,
  antwort: feedback.antwort,
  createdAt: feedback.createdAt,
  updatedAt: feedback.updatedAt,
  melderName: user.name,
  melderEmail: user.email,
} as const;

/** Meldungen samt Melder — gate-los (der Aufrufer verantwortet den Zugriff).
    Default = aktionable Warteschlange (ohne erledigt/verworfen). */
export async function listeFeedback(
  opts: { alle?: boolean; status?: FeedbackStatus } = {},
) {
  const where = opts.status
    ? eq(feedback.status, opts.status)
    : opts.alle
      ? undefined
      : not(inArray(feedback.status, ["erledigt", "verworfen"]));
  return db
    .select(SPALTEN)
    .from(feedback)
    .innerJoin(user, eq(user.id, feedback.createdBy))
    .where(where)
    .orderBy(asc(feedback.createdAt));
}

/** Meldungen, deren id mit dem Präfix beginnt (für die CLI-Kurz-ids). */
export async function findeFeedbackPraefix(praefix: string) {
  return db
    .select({ id: feedback.id, titel: feedback.titel })
    .from(feedback)
    .where(sql`${feedback.id}::text like ${praefix.toLowerCase() + "%"}`)
    .limit(5);
}

/**
 * Status (und optional Antwort) einer Meldung setzen und den Melder bei einem
 * Abschluss best-effort benachrichtigen (siehe `sollBenachrichtigen`).
 * `antwort`: `undefined` = unverändert lassen; String/`null` = setzen/löschen.
 */
export async function setzeFeedbackStatus(input: {
  id: string;
  status: FeedbackStatus;
  antwort?: string | null;
}): Promise<{
  vorher: string;
  nachher: FeedbackStatus;
  titel: string;
  benachrichtigt: boolean;
}> {
  const [row] = await db
    .select({
      titel: feedback.titel,
      status: feedback.status,
      antwort: feedback.antwort,
      melderEmail: user.email,
    })
    .from(feedback)
    .innerJoin(user, eq(user.id, feedback.createdBy))
    .where(eq(feedback.id, input.id))
    .limit(1);
  if (!row) throw new Error("Meldung nicht gefunden.");

  const vorher = row.status;
  const neueAntwort =
    input.antwort === undefined ? row.antwort : input.antwort?.trim() || null;
  const antwortGeaendert = (neueAntwort ?? "") !== (row.antwort ?? "");

  await db
    .update(feedback)
    .set({ status: input.status, antwort: neueAntwort, updatedAt: new Date() })
    .where(eq(feedback.id, input.id));

  let benachrichtigt = false;
  if (sollBenachrichtigen(vorher, input.status, antwortGeaendert)) {
    // „Best effort": ein Mailfehler (z. B. ohne RESEND_API_KEY) darf die
    // Statusänderung nicht rückgängig machen.
    try {
      const baseUrl = process.env.BETTER_AUTH_URL ?? "";
      await sendFeedbackStatusEmail(
        row.melderEmail,
        {
          titel: row.titel,
          status: input.status as "erledigt" | "zurückgestellt" | "verworfen",
          antwort: neueAntwort,
          url: `${baseUrl}/feedback`,
        },
        input.id,
      );
      benachrichtigt = true;
    } catch (e) {
      console.error("[feedback] Melder-Benachrichtigung fehlgeschlagen:", e);
    }
  }

  return { vorher, nachher: input.status, titel: row.titel, benachrichtigt };
}
