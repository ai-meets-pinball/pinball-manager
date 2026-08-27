import { timingSafeEqual } from "node:crypto";
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { machines, termine, user } from "@/db/schema";
import { sendTerminReminderEmail } from "@/lib/email";
import { faelligBis, tageDazwischen } from "@/lib/faelligkeit";

/*
  Täglicher Termin-Reminder (Vercel Cron → vercel.json). Findet offene Termine,
  deren VORLAUF greift (datum − erinnerungTageVorher ≤ heute), und schickt je
  Maschinen-Eigentümer einen Digest. Spiegelt api/cron/maintenance-reminders.

  Absicherung wie dort: Vercel Cron sendet „Authorization: Bearer <CRON_SECRET>";
  ohne gültiges Secret 401. Dedup über `zuletztErinnert` (leer oder älter als
  REMIND_AFTER_TAGE); beim Erledigen/Bearbeiten setzt die Action es auf null.
*/
const REMIND_AFTER_TAGE = 7;

export const dynamic = "force-dynamic";

/** Timing-sicherer Vergleich zweier Strings gleicher Bedeutung. */
function sicherGleich(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !sicherGleich(auth, `Bearer ${secret}`)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - REMIND_AFTER_TAGE * 86_400_000);
  const baseUrl = process.env.BETTER_AUTH_URL ?? "";

  const rows = await db
    .select({
      terminId: termine.id,
      titel: termine.titel,
      datum: termine.datum,
      machineId: machines.id,
      hersteller: machines.hersteller,
      modell: machines.modell,
      ownerId: machines.ownerId,
      email: user.email,
    })
    .from(termine)
    .innerJoin(machines, eq(termine.machineId, machines.id))
    .innerJoin(user, eq(machines.ownerId, user.id))
    .where(
      and(
        isNull(termine.erledigtAm),
        // Erinnern, sobald der Vorlauf greift: (datum − Vorlauf) ≤ Ende heute.
        sql`${termine.datum} - make_interval(days => ${termine.erinnerungTageVorher}) <= ${faelligBis(now)}`,
        or(isNull(termine.zuletztErinnert), lt(termine.zuletztErinnert, cutoff)),
      ),
    );

  // Je Eigentümer gruppieren → ein Digest, gegliedert nach Gerät.
  type Owner = {
    ownerId: string;
    email: string;
    geraete: Map<string, { geraet: string; id: string; punkte: string[] }>;
    terminIds: string[];
  };
  const byOwner = new Map<string, Owner>();
  for (const r of rows) {
    let o = byOwner.get(r.ownerId);
    if (!o) {
      o = { ownerId: r.ownerId, email: r.email, geraete: new Map(), terminIds: [] };
      byOwner.set(r.ownerId, o);
    }
    let g = o.geraete.get(r.machineId);
    if (!g) {
      g = { geraet: `${r.hersteller} ${r.modell}`, id: r.machineId, punkte: [] };
      o.geraete.set(r.machineId, g);
    }
    const tage = tageDazwischen(now, r.datum);
    const wann =
      tage < 0
        ? `überfällig seit ${-tage} Tag${-tage === 1 ? "" : "en"}`
        : tage === 0
          ? "heute fällig"
          : `in ${tage} Tag${tage === 1 ? "" : "en"}`;
    g.punkte.push(`${r.titel} — ${r.datum.toLocaleDateString("de-DE")} (${wann})`);
    o.terminIds.push(r.terminId);
  }

  let empfaenger = 0;
  let erinnert = 0;
  for (const o of byOwner.values()) {
    try {
      await sendTerminReminderEmail(o.email, [...o.geraete.values()], baseUrl);
      // Nur bei Erfolg als „erinnert" markieren, sonst greift der nächste Lauf erneut.
      await db
        .update(termine)
        .set({ zuletztErinnert: now })
        .where(inArray(termine.id, o.terminIds));
      empfaenger += 1;
      erinnert += o.terminIds.length;
    } catch (e) {
      console.error("[termin-reminders]", o.ownerId, (e as Error).message);
    }
  }

  return Response.json({ empfaenger, erinnert, geprueft: rows.length });
}
