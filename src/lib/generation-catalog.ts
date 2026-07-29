import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { generations, machineModels } from "@/db/schema";

/*
  Generation-Katalog (Datenmodell-Redesign Phase 4a). Reine Kernlogik ohne
  "use server", damit sie BEIDE Wege teilen: der Super-Admin-Upload
  (db/actions/generations.ts) und das einmalige Seed-Skript.

  Quelle ist ein Export aus einem Schwesterprojekt: je Automat `opdbId` +
  `generation.name` (Board-/Hardware-System). Der Export ist die PRIMÄRE Quelle;
  Modelle ohne Treffer bleiben ohne Generation und werden im Admin von Hand
  zugeordnet. Ein erneuter Import ist idempotent (Generationen per Name-Unique,
  Zuordnung nur für nicht-manuelle Modelle) — so überschreibt er Hand-Overrides
  (generationManuell) nicht.
*/

const recordSchema = z.object({
  opdbId: z.string().nullable().optional(),
  generation: z.object({ name: z.string() }).nullable().optional(),
  manufacturer: z.string().nullable().optional(),
  year: z.number().nullable().optional(),
});

export type CatalogRecord = z.infer<typeof recordSchema>;

/** Aus dem Roh-JSON die Katalog-Einträge ziehen — akzeptiert `{ machines: [...] }`
    (Export-Format) oder direkt ein Array. Wirft bei grob falschem Format. */
export function parseCatalog(json: unknown): CatalogRecord[] {
  const arr = Array.isArray(json)
    ? json
    : (json as { machines?: unknown } | null)?.machines;
  const parsed = z.array(recordSchema).safeParse(arr);
  if (!parsed.success) {
    throw new Error(
      "Unerwartetes Katalog-Format — erwartet wird { machines: [ { opdbId, generation } … ] }.",
    );
  }
  return parsed.data;
}

export type CatalogResult = {
  generationenNeu: number;
  generationenGesamt: number;
  zugeordnet: number;
  uebersprungenManuell: number;
  ohneTreffer: number;
};

/** Katalog anwenden: Generationen upserten (per Name) und die Generation der
    Modelle über den opdb-Bezug setzen — Machine-Ref bevorzugt, sonst Group-Ref.
    Manuell zugeordnete Modelle (generationManuell) bleiben unberührt. */
export async function applyGenerationCatalog(
  records: CatalogRecord[],
): Promise<CatalogResult> {
  // Aus den Records: je Generation Metadaten sammeln und opdb → Generation-Name.
  const genMeta = new Map<
    string,
    { hersteller: string | null; jahrVon: number | null; jahrBis: number | null }
  >();
  const byMachine = new Map<string, string>(); // opdbId (Machine-Ref) → Name
  const byGroup = new Map<string, string>(); // Group-Ref → Name (erster Treffer)

  for (const r of records) {
    const name = r.generation?.name;
    if (!name) continue;
    const meta = genMeta.get(name) ?? { hersteller: null, jahrVon: null, jahrBis: null };
    if (r.manufacturer && !meta.hersteller) meta.hersteller = r.manufacturer;
    if (typeof r.year === "number") {
      meta.jahrVon = meta.jahrVon == null ? r.year : Math.min(meta.jahrVon, r.year);
      meta.jahrBis = meta.jahrBis == null ? r.year : Math.max(meta.jahrBis, r.year);
    }
    genMeta.set(name, meta);
    if (r.opdbId) {
      byMachine.set(r.opdbId, name);
      const group = r.opdbId.split("-")[0];
      if (!byGroup.has(group)) byGroup.set(group, name);
    }
  }

  // Generationen upserten (Name ist unique → onConflictDoNothing).
  let generationenNeu = 0;
  for (const [name, meta] of genMeta) {
    const eingefuegt = await db
      .insert(generations)
      .values({ name, hersteller: meta.hersteller, jahrVon: meta.jahrVon, jahrBis: meta.jahrBis })
      .onConflictDoNothing({ target: generations.name })
      .returning({ id: generations.id });
    if (eingefuegt.length > 0) generationenNeu++;
  }

  const alleGen = await db
    .select({ id: generations.id, name: generations.name })
    .from(generations);
  const genId = new Map(alleGen.map((g) => [g.name, g.id]));

  // Modelle zuordnen — nur die nicht von Hand gesetzten.
  const modelle = await db
    .select({
      id: machineModels.id,
      opdbRef: machineModels.opdbRef,
      groupRef: machineModels.opdbGroupRef,
      manuell: machineModels.generationManuell,
      aktuell: machineModels.generationId,
    })
    .from(machineModels);

  let zugeordnet = 0;
  let uebersprungenManuell = 0;
  let ohneTreffer = 0;

  for (const m of modelle) {
    const name =
      (m.opdbRef && byMachine.get(m.opdbRef)) ||
      (m.groupRef && byGroup.get(m.groupRef)) ||
      null;
    if (!name) {
      ohneTreffer++;
      continue;
    }
    if (m.manuell) {
      uebersprungenManuell++;
      continue;
    }
    const gid = genId.get(name);
    if (gid && m.aktuell !== gid) {
      await db
        .update(machineModels)
        .set({ generationId: gid })
        .where(eq(machineModels.id, m.id));
      zugeordnet++;
    }
  }

  return {
    generationenNeu,
    generationenGesamt: alleGen.length,
    zugeordnet,
    uebersprungenManuell,
    ohneTreffer,
  };
}
