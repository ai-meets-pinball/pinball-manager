"use server";

import { eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { generations, machineModels } from "@/db/schema";
import { requireUser } from "@/lib/session";

/*
  Typeahead-Suche im EIGENEN Modell-Katalog (machine_models) — die primäre
  Quelle beim Anlegen einer Maschine. Anders als die OPDB-Suche liefert sie den
  vollen Datensatz (inkl. Bild + Generation) in EINEM Roundtrip.
*/

export type ModelSearchResult = {
  id: string;
  hersteller: string;
  modell: string;
  baujahr: number | null;
  opdbRef: string;
  ipdbRef: string | null;
  imageUrl: string | null;
  generationName: string | null;
};

export async function searchMachineModels(
  query: string,
): Promise<ModelSearchResult[]> {
  await requireUser();
  const q = query.trim();
  if (q.length < 2) return [];

  return db
    .select({
      id: machineModels.id,
      hersteller: machineModels.hersteller,
      modell: machineModels.modell,
      baujahr: machineModels.baujahr,
      opdbRef: machineModels.opdbRef,
      ipdbRef: machineModels.ipdbRef,
      imageUrl: machineModels.imageUrl,
      generationName: generations.name,
    })
    .from(machineModels)
    .leftJoin(generations, eq(generations.id, machineModels.generationId))
    .where(
      or(
        ilike(machineModels.hersteller, `%${q}%`),
        ilike(machineModels.modell, `%${q}%`),
        ilike(machineModels.opdbRef, `%${q}%`),
      ),
    )
    .orderBy(machineModels.modell, machineModels.hersteller)
    .limit(8);
}
