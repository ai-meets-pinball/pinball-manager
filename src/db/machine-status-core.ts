import { eq } from "drizzle-orm";
import { db } from "@/db";
import { faults, machines } from "@/db/schema";
import { naechsterStatus } from "@/lib/betriebsstatus";

/*
  Betriebsstatus-Nachzug — die reinen DB-Helfer, BEWUSST ohne "use server".

  Diese Funktionen tragen kein Auth-Gate (sie werden aus bereits autorisierten
  Aktionen heraus gerufen). Lägen sie in einem "use server"-Modul, wären die
  exportierten async-Funktionen automatisch als Server Actions (POST) von außen
  erreichbar. Darum stehen sie hier als normales Server-Modul; die
  Formular-Actions mit Gate liegen in db/actions/machine-status.ts.

  Die REGEL (abgeleitet vs. gepinnt, wann sich überhaupt etwas ändert) liegt in
  lib/betriebsstatus.ts und ist dort direkt getestet.
*/

/** Der Transaktions-Handle von Drizzle — dieselbe Abfrage-Schnittstelle wie `db`. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Effektivstatus neu berechnen (No-Op, wenn manuell gepinnt oder unverändert). */
async function statusNachziehen(tx: Tx, machineId: string): Promise<void> {
  const [m] = await tx
    .select({ status: machines.status, statusManuell: machines.statusManuell })
    .from(machines)
    .where(eq(machines.id, machineId))
    .limit(1);
  if (!m) return;

  // Die Fehler kommen ungefiltert herein: WELCHE einen Betrieb einschränken,
  // entscheidet lib/betriebsstatus.ts — nicht die WHERE-Klausel.
  const fehler = await tx
    .select({ prioritaet: faults.prioritaet, status: faults.status })
    .from(faults)
    .where(eq(faults.machineId, machineId));

  const neu = naechsterStatus(m, fehler);
  if (neu === null) return;

  await tx
    .update(machines)
    .set({
      status: neu,
      statusSeit: new Date(),
      statusGrund: null,
      statusVon: null,
    })
    .where(eq(machines.id, machineId));
}

/**
 * Eine Fehler- oder Reparatur-Mutation ausführen und den Betriebsstatus im
 * SELBEN Vorgang nachziehen.
 *
 * Vorher trugen sechs Aufrufstellen die Pflicht, danach den Status nachzuziehen
 * — eine neue Mutationsquelle hätte ihn still veralten lassen. Jetzt ist der
 * Nachzug Teil des Aufrufs und läuft in derselben Transaktion: schlägt er fehl,
 * gilt auch die Mutation nicht, und es kann kein Zwischenzustand entstehen, in
 * dem ein kritischer Fehler offen ist, die Maschine aber „spielbereit" heißt.
 */
export async function mitStatusNachzug<T>(
  machineId: string,
  mutation: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const ergebnis = await mutation(tx);
    await statusNachziehen(tx, machineId);
    return ergebnis;
  });
}

/** Nur den Status nachziehen, ohne begleitende Mutation (Zurück auf Automatik). */
export async function aktualisiereMaschinenStatus(
  machineId: string,
): Promise<void> {
  await db.transaction((tx) => statusNachziehen(tx, machineId));
}
