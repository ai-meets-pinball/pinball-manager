import { count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { mailLog } from "@/db/schema";

/* Versand-Protokoll (mail_log). Der Admin-Lesepfad ist über das admin/layout
   (Super-Admin) abgesichert; der Feedback-Inline-Pfad über die Triage-Seite
   (Super-Admin). */

/** Seite des Protokolls (neueste zuerst) + Kategorie-Zähler für den Filter. */
export async function getMailProtokoll(opts: {
  kategorie?: string;
  seite: number;
  proSeite: number;
}) {
  const gruppen = await db
    .select({ kategorie: mailLog.kategorie, n: count() })
    .from(mailLog)
    .groupBy(mailLog.kategorie);
  const kategorien = gruppen.map((g) => ({
    kategorie: g.kategorie,
    n: Number(g.n),
  }));
  const gesamtAlle = kategorien.reduce((s, k) => s + k.n, 0);

  const where = opts.kategorie
    ? eq(mailLog.kategorie, opts.kategorie)
    : undefined;
  const gesamt = opts.kategorie
    ? (kategorien.find((k) => k.kategorie === opts.kategorie)?.n ?? 0)
    : gesamtAlle;

  const rows = await db
    .select()
    .from(mailLog)
    .where(where)
    .orderBy(desc(mailLog.gesendetAm))
    .limit(opts.proSeite)
    .offset((opts.seite - 1) * opts.proSeite);

  return { rows, gesamt, kategorien, gesamtAlle };
}

/** Alle protokollierten Mails zu einer Menge Feedback-Meldungen (für die
    Inline-Historie in der Triage), neueste zuerst. */
export async function getFeedbackMailLog(feedbackIds: string[]) {
  if (feedbackIds.length === 0) return [];
  return db
    .select()
    .from(mailLog)
    .where(inArray(mailLog.feedbackId, feedbackIds))
    .orderBy(desc(mailLog.gesendetAm));
}
