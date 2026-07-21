import { and, eq, inArray, isNotNull, isNull, lt, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { machines, maintenanceTasks, user } from "@/db/schema";
import { sendMaintenanceReminderEmail } from "@/lib/email";

/*
  Täglicher Wartungs-Reminder (Vercel Cron → vercel.json). Findet fällige,
  zeitbasierte Wartungspunkte und schickt je Maschinen-Eigentümer einen Digest.

  Absicherung: Vercel Cron sendet automatisch „Authorization: Bearer <CRON_SECRET>",
  wenn CRON_SECRET gesetzt ist — ohne gültiges Secret 401 (die Route ist sonst
  öffentlich erreichbar).

  Dedup: nur erinnern, wenn `zuletztErinnert` leer oder älter als REMIND_AFTER_TAGE
  ist; nach erfolgreichem Versand wird `zuletztErinnert` gesetzt. Beim Erledigen
  eines Punkts setzt die Action `zuletztErinnert` wieder auf null (nächster Zyklus).
*/

// Maschinen-Eigentümer bekommen die Erinnerung (Club-weit als Folgeschritt).
const REMIND_AFTER_TAGE = 7;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - REMIND_AFTER_TAGE * 86_400_000);
  const baseUrl = process.env.BETTER_AUTH_URL ?? "";

  const rows = await db
    .select({
      taskId: maintenanceTasks.id,
      titel: maintenanceTasks.titel,
      machineId: machines.id,
      hersteller: machines.hersteller,
      modell: machines.modell,
      ownerId: machines.ownerId,
      email: user.email,
      name: user.name,
    })
    .from(maintenanceTasks)
    .innerJoin(machines, eq(maintenanceTasks.machineId, machines.id))
    .innerJoin(user, eq(machines.ownerId, user.id))
    .where(
      and(
        eq(maintenanceTasks.aktiv, true),
        isNotNull(maintenanceTasks.naechsteFaelligkeit),
        lte(maintenanceTasks.naechsteFaelligkeit, now),
        or(
          isNull(maintenanceTasks.zuletztErinnert),
          lt(maintenanceTasks.zuletztErinnert, cutoff),
        ),
      ),
    );

  // Je Eigentümer gruppieren → ein Digest, gegliedert nach Gerät.
  type Owner = {
    email: string;
    geraete: Map<string, { geraet: string; id: string; punkte: string[] }>;
    taskIds: string[];
  };
  const byOwner = new Map<string, Owner>();
  for (const r of rows) {
    let o = byOwner.get(r.ownerId);
    if (!o) {
      o = { email: r.email, geraete: new Map(), taskIds: [] };
      byOwner.set(r.ownerId, o);
    }
    let g = o.geraete.get(r.machineId);
    if (!g) {
      g = { geraet: `${r.hersteller} ${r.modell}`, id: r.machineId, punkte: [] };
      o.geraete.set(r.machineId, g);
    }
    g.punkte.push(r.titel);
    o.taskIds.push(r.taskId);
  }

  let empfaenger = 0;
  let erinnert = 0;
  for (const o of byOwner.values()) {
    try {
      await sendMaintenanceReminderEmail(o.email, [...o.geraete.values()], baseUrl);
      // Nur bei Erfolg als „erinnert" markieren, sonst greift der nächste Lauf erneut.
      await db
        .update(maintenanceTasks)
        .set({ zuletztErinnert: now })
        .where(inArray(maintenanceTasks.id, o.taskIds));
      empfaenger += 1;
      erinnert += o.taskIds.length;
    } catch (e) {
      console.error("[maintenance-reminders]", o.email, (e as Error).message);
    }
  }

  return Response.json({ empfaenger, erinnert, geprueft: rows.length });
}
