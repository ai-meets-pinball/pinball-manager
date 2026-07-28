import { eq } from "drizzle-orm";
import { db } from "@/db";
import { machineData } from "@/db/schema";
import { extractSchema, FACT_TYPES } from "@/lib/validators";

/*
  Zentrale Schreibstelle für Handbuch-Fakten (machine_data). Bewusst ein eigenes,
  reines Modul (kein "use server"), damit BEIDE Wege es teilen: die streamende
  KI-Extraktion (lib/manual-extract.ts) und der JSON-Import
  (db/actions/machine-data.ts).

  Replace-Semantik: alle Zeilen der Maschine löschen, dann je vorhandenem Typ
  (≥ 1 Zeile) neu einfügen — genau EINE Zeile je (machineId, typ), passend zum
  Unique-Index. Skip-if-empty: ein leeres Ergebnis (kein Typ mit Zeilen) löscht
  NICHTS (vorhandene Fakten bleiben erhalten).
*/
export type ExtractResult = ReturnType<typeof extractSchema.parse>;

export async function replaceMachineFacts(
  machineId: string,
  result: ExtractResult,
): Promise<Record<string, number>> {
  const present = FACT_TYPES.filter((t) => result[t].rows.length > 0);
  const counts: Record<string, number> = {};
  if (present.length === 0) return counts;

  await db.transaction(async (tx) => {
    await tx.delete(machineData).where(eq(machineData.machineId, machineId));
    for (const typ of present) {
      await tx.insert(machineData).values({ machineId, typ, daten: result[typ] });
      counts[typ] = result[typ].rows.length;
    }
  });
  return counts;
}
