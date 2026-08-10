import {
  and,
  count,
  desc,
  eq,
  inArray,
  lte,
} from "drizzle-orm";
import { db } from "@/db";
import {
  machines,
  maintenanceLog,
  maintenanceTasks,
} from "@/db/schema";
import {
  baldBis,
  faelligBis,
  faelligkeit,
  type FaelligkeitsStatus,
} from "@/lib/faelligkeit";
import {
  type SessionUser,
} from "@/lib/session";
import { sichtbareMaschinenFilter } from "@/db/queries/machines";

/*
  Wartung: Fälligkeit je Punkt und die Mengen-Abfragen für Dashboard und
  Listen-Badges. Die Fälligkeitsregel selbst liegt in lib/faelligkeit.ts.
*/

const PRIO_RANG: Record<string, number> = {
  kritisch: 5,
  "sehr hoch": 4,
  hoch: 3,
  mittel: 2,
  niedrig: 1,
};
const STATUS_RANG: Record<FaelligkeitsStatus, number> = {
  faellig: 0,
  bald: 1,
  ok: 2,
  "kein-termin": 3,
};

/** Wartungspunkte einer Maschine samt Historie und berechnetem Fälligkeits-
    Status, sortiert nach Dringlichkeit → Priorität → Titel. */
export async function getMaintenanceTasks(machineId: string) {
  const tasks = await db.query.maintenanceTasks.findMany({
    where: eq(maintenanceTasks.machineId, machineId),
    with: { logs: { orderBy: [desc(maintenanceLog.datum)] } },
  });
  const jetzt = new Date();
  return tasks
    .map((t) => ({ ...t, ...faelligkeit(t, jetzt) }))
    .sort((a, b) => {
      const s = STATUS_RANG[a.status] - STATUS_RANG[b.status];
      if (s !== 0) return s;
      const p = (PRIO_RANG[b.prioritaet] ?? 0) - (PRIO_RANG[a.prioritaet] ?? 0);
      if (p !== 0) return p;
      return a.titel.localeCompare(b.titel, "de");
    });
}

/** Dashboard: anstehende Wartungen (überfällig oder bald fällig) über die
    sichtbaren Maschinen — samt Maschine, nach Termin sortiert. */
export async function getDueMaintenanceForMachines(
  currentUser: SessionUser,
  machineIds: string[],
) {
  if (machineIds.length === 0) return [];
  const jetzt = new Date();
  const sichtbar = await sichtbareMaschinenFilter(currentUser.id);
  const rows = await db
    .select({
      id: maintenanceTasks.id,
      machineId: maintenanceTasks.machineId,
      titel: maintenanceTasks.titel,
      prioritaet: maintenanceTasks.prioritaet,
      intervallTyp: maintenanceTasks.intervallTyp,
      naechsteFaelligkeit: maintenanceTasks.naechsteFaelligkeit,
      hersteller: machines.hersteller,
      modell: machines.modell,
    })
    .from(maintenanceTasks)
    .innerJoin(machines, eq(machines.id, maintenanceTasks.machineId))
    .where(
      and(
        inArray(maintenanceTasks.machineId, machineIds),
        // Nicht auf den Aufrufer verlassen: dieselbe Sichtbarkeitsregel wie in
        // der Maschinenliste, hier als Bedingung im Join.
        sichtbar,
        eq(maintenanceTasks.aktiv, true),
        // Fenster: fällig + „bald" — Grenze aus derselben Quelle wie faelligkeit().
        lte(maintenanceTasks.naechsteFaelligkeit, baldBis(jetzt)),
      ),
    )
    .orderBy(maintenanceTasks.naechsteFaelligkeit);
  return rows.map((r) => ({ ...r, ...faelligkeit(r, jetzt) }));
}

/** Anzahl fälliger Wartungen je Maschine — für die Badges in der Maschinenliste.
    Nur aktive, zeitbasierte Punkte mit Termin. „Fällig" schließt den heutigen
    Tag ein; die Grenze kommt aus derselben Quelle wie faelligkeit(). */
export async function getDueMaintenanceCountByMachine(
  currentUser: SessionUser,
  machineIds: string[],
) {
  const map = new Map<string, number>();
  if (machineIds.length === 0) return map;
  const sichtbar = await sichtbareMaschinenFilter(currentUser.id);
  const rows = await db
    .select({ machineId: maintenanceTasks.machineId, n: count() })
    .from(maintenanceTasks)
    // Join nur, damit der Sichtbarkeitsfilter auf machines zugreifen kann.
    .innerJoin(machines, eq(machines.id, maintenanceTasks.machineId))
    .where(
      and(
        inArray(maintenanceTasks.machineId, machineIds),
        sichtbar,
        eq(maintenanceTasks.aktiv, true),
        lte(maintenanceTasks.naechsteFaelligkeit, faelligBis(new Date())),
      ),
    )
    .groupBy(maintenanceTasks.machineId);
  for (const r of rows) map.set(r.machineId, Number(r.n));
  return map;
}
