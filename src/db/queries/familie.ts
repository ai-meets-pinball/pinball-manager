import { alias } from "drizzle-orm/pg-core";
import { and, eq, isNotNull, or } from "drizzle-orm";
import { db } from "@/db";
import { machineModels } from "@/db/schema";

/*
  Die FAMILIE eines Modells: alle Katalogzeilen mit demselben Familienschlüssel
  (`opdbMachineRef`, erste zwei Segmente der OPDB-Referenz) — baugleiche
  Editionen wie LE, Premium und Premium/LE. Wissen, Guides, Tipps, geteilte
  Reparaturen und die Generation werden über die ganze Familie gelesen, statt
  an EINER Zeile zu hängen (Regel: lib/opdb-ref.ts).

  Ein Roundtrip per Selbst-Join: die Zeile selbst ist immer dabei (auch ohne
  Schlüssel — dann ist sie ihre eigene Familie).
*/
export type Familie = {
  /** Alle Modell-ids der Familie, inkl. der angefragten — für inArray(). */
  ids: string[];
  selbst: FamilienMitglied | null;
  /** Die anderen Editionen (ohne die angefragte Zeile). */
  geschwister: FamilienMitglied[];
  /** Eigene Generation, sonst die eines Geschwisters (Editionen sind baugleich). */
  generationId: string | null;
};

export type FamilienMitglied = {
  id: string;
  opdbRef: string;
  opdbMachineRef: string | null;
  hersteller: string;
  modell: string;
  baujahr: number | null;
  imageUrl: string | null;
  generationId: string | null;
};

export async function getFamilie(modelId: string): Promise<Familie> {
  const m = alias(machineModels, "m");
  const rows = await db
    .select({
      id: machineModels.id,
      opdbRef: machineModels.opdbRef,
      opdbMachineRef: machineModels.opdbMachineRef,
      hersteller: machineModels.hersteller,
      modell: machineModels.modell,
      baujahr: machineModels.baujahr,
      imageUrl: machineModels.imageUrl,
      generationId: machineModels.generationId,
    })
    .from(machineModels)
    .innerJoin(
      m,
      and(
        eq(m.id, modelId),
        or(
          eq(machineModels.id, m.id),
          and(
            isNotNull(m.opdbMachineRef),
            eq(machineModels.opdbMachineRef, m.opdbMachineRef),
          ),
        ),
      ),
    )
    .orderBy(machineModels.modell);

  const selbst = rows.find((r) => r.id === modelId) ?? null;
  return {
    // Fehlt das Modell ganz, bleibt die id drin — inArray([]) wäre ein Fehler.
    ids: rows.length > 0 ? rows.map((r) => r.id) : [modelId],
    selbst,
    geschwister: rows.filter((r) => r.id !== modelId),
    generationId:
      selbst?.generationId ?? rows.find((r) => r.generationId)?.generationId ?? null,
  };
}
