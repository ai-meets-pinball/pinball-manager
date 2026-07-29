import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { knowledge } from "@/db/schema";
import { extractSchema, FACT_TYPES } from "@/lib/validators";

/*
  Zentrale Schreibstelle für Handbuch-Fakten. Bewusst ein eigenes, reines Modul
  (kein "use server"), damit BEIDE Wege es teilen: die streamende KI-Extraktion
  (lib/manual-extract.ts) und der JSON-Import (db/actions/machine-data.ts).
*/
export type ExtractResult = ReturnType<typeof extractSchema.parse>;

/*
  Datenmodell-Redesign (Phase 1): Handbuch-Fakten als MODELL-Wissen schreiben.
  Ein `knowledge`-Eintrag (typ='handbuch_fakten') je Autor und Ebene (Modell,
  wenn die Maschine einen Gerätetyp hat, sonst Maschine) — Replace-Semantik:
  der eine Eintrag dieses Autors für diese Ebene wird ersetzt. `inhalt` ist das
  extractSchema-Objekt, aber nur mit den vorhandenen (nicht-leeren) Typen.
  Skip-if-empty: ein leeres Ergebnis schreibt nichts.
*/
export async function upsertModelKnowledge(opts: {
  userId: string;
  machine: {
    id: string;
    modelId: string | null;
    hersteller: string;
    modell: string;
  };
  result: ExtractResult;
  visibility: "privat" | "club" | "oeffentlich";
  clubId?: string | null;
}): Promise<number> {
  const { userId, machine, result, visibility, clubId } = opts;
  const present = FACT_TYPES.filter((t) => result[t].rows.length > 0);
  if (present.length === 0) return 0;

  const inhalt = Object.fromEntries(present.map((t) => [t, result[t]]));
  const amModell = machine.modelId != null;

  await db.transaction(async (tx) => {
    // Replace-Semantik: den EINEN Eintrag dieses Autors für diese Ebene ersetzen.
    await tx.delete(knowledge).where(
      and(
        eq(knowledge.createdBy, userId),
        eq(knowledge.typ, "handbuch_fakten"),
        amModell
          ? eq(knowledge.modelId, machine.modelId!)
          : eq(knowledge.machineId, machine.id),
      ),
    );
    await tx.insert(knowledge).values({
      typ: "handbuch_fakten",
      titel: `${machine.hersteller} ${machine.modell} — Handbuch-Daten`,
      inhalt,
      sourceType: "extrahiert",
      visibility,
      modelId: amModell ? machine.modelId : null,
      machineId: amModell ? null : machine.id,
      clubId: visibility === "club" ? (clubId ?? null) : null,
      createdBy: userId,
    });
  });

  return present.length;
}

/*
  Troubleshooting-Guide als Wissenseintrag (Datenmodell-Redesign Phase 2). Wie
  die Fakten ein `knowledge`-Eintrag je Autor und Ebene (Modell, wenn die
  Maschine einen Gerätetyp hat, sonst Maschine) — typ='troubleshooting',
  sourceType='eigen' (KI-erzeugt, nicht aus einem Handbuch extrahiert). Der
  Guide selbst plus die Provenienz (websuche, Modell) liegen als kleiner
  Umschlag in `inhalt`, damit die Anzeige die Websuche-Kennzeichnung behält.
  Replace-Semantik: der eine Guide dieses Autors für diese Ebene wird ersetzt.
*/
export async function upsertTroubleshootingKnowledge(opts: {
  userId: string;
  machine: {
    id: string;
    modelId: string | null;
    hersteller: string;
    modell: string;
  };
  guide: unknown; // troubleshootingGuideSchema-Objekt
  websuche: boolean;
  model: string;
  visibility: "privat" | "club" | "oeffentlich";
  clubId?: string | null;
}): Promise<void> {
  const { userId, machine, guide, websuche, model, visibility, clubId } = opts;
  const amModell = machine.modelId != null;

  await db.transaction(async (tx) => {
    await tx.delete(knowledge).where(
      and(
        eq(knowledge.createdBy, userId),
        eq(knowledge.typ, "troubleshooting"),
        amModell
          ? eq(knowledge.modelId, machine.modelId!)
          : eq(knowledge.machineId, machine.id),
      ),
    );
    await tx.insert(knowledge).values({
      typ: "troubleshooting",
      titel: `${machine.hersteller} ${machine.modell} — Troubleshooting-Guide`,
      inhalt: { guide, websuche, model },
      sourceType: "eigen",
      visibility,
      modelId: amModell ? machine.modelId : null,
      machineId: amModell ? null : machine.id,
      clubId: visibility === "club" ? (clubId ?? null) : null,
      createdBy: userId,
    });
  });
}
