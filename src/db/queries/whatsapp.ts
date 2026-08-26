import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { userSettings, whatsappLog, whatsappOptin } from "@/db/schema";

/* Lesepfade rund um die WhatsApp-Benachrichtigung. Der Account-Status ist
   nutzer-eigen; das Protokoll ist über das admin/layout (Super-Admin) abgesichert. */

/** Nummer + aktive Club-Opt-ins des Nutzers (für die Account-Seite). */
export async function getWhatsappStatus(
  userId: string,
): Promise<{ nummer: string | null; aktiveClubIds: string[] }> {
  try {
    const [settings] = await db
      .select({ nummer: userSettings.whatsappNummer })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    const optins = await db
      .select({ clubId: whatsappOptin.clubId })
      .from(whatsappOptin)
      .where(
        and(eq(whatsappOptin.userId, userId), eq(whatsappOptin.aktiv, true)),
      );

    return {
      nummer: settings?.nummer ?? null,
      aktiveClubIds: optins.map((o) => o.clubId),
    };
  } catch (e) {
    // Schema-Drift-fest: die Account-Seite soll nie an dieser Nebensache kippen.
    console.error("[whatsapp] Status nicht ladbar, nutze leer:", e);
    return { nummer: null, aktiveClubIds: [] };
  }
}

/** Seite des Versand-Protokolls (neueste zuerst) für /admin/whatsapp. */
export async function getWhatsappProtokoll(opts: {
  seite: number;
  proSeite: number;
}): Promise<{ rows: (typeof whatsappLog.$inferSelect)[]; gesamt: number }> {
  try {
    const [g] = await db.select({ n: count() }).from(whatsappLog);
    const gesamt = Number(g?.n ?? 0);

    const rows = await db
      .select()
      .from(whatsappLog)
      .orderBy(desc(whatsappLog.gesendetAm))
      .limit(opts.proSeite)
      .offset((opts.seite - 1) * opts.proSeite);

    return { rows, gesamt };
  } catch (e) {
    // Schema-Drift-fest: leeres Protokoll statt 500 auf /admin/whatsapp.
    console.error("[whatsapp] Protokoll nicht ladbar, nutze leer:", e);
    return { rows: [], gesamt: 0 };
  }
}
