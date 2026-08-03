import { and, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { knowledge, knowledgeRevisions } from "@/db/schema";
import { modellName } from "@/lib/format";
import { extractSchema, FACT_TYPES } from "@/lib/validators";

/*
  Zentrale Schreibstelle für Handbuch-Fakten. Bewusst ein eigenes, reines Modul
  (kein "use server"), damit BEIDE Wege es teilen: die streamende KI-Extraktion
  (lib/manual-extract.ts) und der JSON-Import (db/actions/machine-data.ts).
*/
export type ExtractResult = ReturnType<typeof extractSchema.parse>;

/*
  Ersetzt die frühere DELETE+INSERT-Replace-Semantik: existiert der EINE Eintrag
  dieses Autors für diese Ebene bereits, wird er IN PLACE aktualisiert — die id
  bleibt stabil, Community-Signale und persönliche Overrides überleben — und der
  alte Stand wird vorher als Revision (`knowledge_revisions`) gesichert.
  Sichtbarkeit/Club-Anker bleiben beim UPDATE bewusst unangetastet: die beim
  Formular gewählte Sichtbarkeit gilt nur für NEUE Einträge — eine Neu-
  Generierung darf nichts still veröffentlichen oder privatisieren.
*/
async function schreibeMitRevision(opts: {
  /** Schlüssel des EINEN Eintrags: and(createdBy, typ, Ebenen-Anker). */
  where: SQL;
  userId: string;
  kommentar: string;
  neu: typeof knowledge.$inferInsert;
}): Promise<void> {
  const { where, userId, kommentar, neu } = opts;
  await db.transaction(async (tx) => {
    const [alt] = await tx
      .select({ id: knowledge.id, titel: knowledge.titel, inhalt: knowledge.inhalt })
      .from(knowledge)
      .where(where)
      .limit(1);

    if (alt) {
      await tx.insert(knowledgeRevisions).values({
        knowledgeId: alt.id,
        titel: alt.titel,
        inhalt: alt.inhalt,
        editedBy: userId,
        kommentar,
      });
      await tx
        .update(knowledge)
        .set({
          titel: neu.titel,
          inhalt: neu.inhalt,
          sourceType: neu.sourceType,
          updatedAt: new Date(),
        })
        .where(eq(knowledge.id, alt.id));
    } else {
      await tx.insert(knowledge).values(neu);
    }
  });
}

/*
  Datenmodell-Redesign (Phase 1): Handbuch-Fakten als MODELL-Wissen schreiben.
  Ein `knowledge`-Eintrag (typ='handbuch_fakten') je Autor und Ebene (Modell,
  wenn die Maschine ein Modell hat, sonst Maschine). Existiert er, wird er per
  `schreibeMitRevision` in place aktualisiert (id/Signale bleiben, alter Stand →
  Verlauf). `inhalt` ist das extractSchema-Objekt, aber nur mit den vorhandenen
  (nicht-leeren) Typen. Skip-if-empty: ein leeres Ergebnis schreibt nichts.
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

  await schreibeMitRevision({
    where: and(
      eq(knowledge.createdBy, userId),
      eq(knowledge.typ, "handbuch_fakten"),
      amModell
        ? eq(knowledge.modelId, machine.modelId!)
        : eq(knowledge.machineId, machine.id),
    )!,
    userId,
    kommentar: "Neu extrahiert/importiert",
    neu: {
      typ: "handbuch_fakten",
      titel: `${modellName(machine)} — Handbuch-Daten`,
      inhalt,
      sourceType: "extrahiert",
      visibility,
      modelId: amModell ? machine.modelId : null,
      machineId: amModell ? null : machine.id,
      clubId: visibility === "club" ? (clubId ?? null) : null,
      createdBy: userId,
    },
  });

  return present.length;
}

/*
  Troubleshooting-Guide als Wissenseintrag (Datenmodell-Redesign Phase 2). Wie
  die Fakten ein `knowledge`-Eintrag je Autor und Ebene (Modell, wenn die
  Maschine ein Modell hat, sonst Maschine) — typ='troubleshooting',
  sourceType='eigen' (KI-erzeugt, nicht aus einem Handbuch extrahiert). Der
  Guide selbst plus die Provenienz (websuche, Modell) liegen als kleiner
  Umschlag in `inhalt`, damit die Anzeige die Websuche-Kennzeichnung behält.
  Der eine Guide dieses Autors für diese Ebene wird per `schreibeMitRevision`
  in place aktualisiert (Ebenenwechsel = anderer Schlüssel = eigener Eintrag).
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
  /** Auf Generation-Ebene ablegen (gilt für ALLE Modelle der Generation). Nur
      wirksam mit generationId; sonst greift die Modell-/Maschinen-Ebene. */
  aufGeneration?: boolean;
  generationId?: string | null;
  generationName?: string | null;
}): Promise<void> {
  const {
    userId,
    machine,
    guide,
    websuche,
    model,
    visibility,
    clubId,
    aufGeneration,
    generationId,
    generationName,
  } = opts;

  // Zielebene bestimmen: Generation (bewusst gewählt) > Modell > Maschine.
  const aufGen = aufGeneration === true && generationId != null;
  const ziel = aufGen
    ? { where: eq(knowledge.generationId, generationId!), generationId, modelId: null, machineId: null }
    : machine.modelId != null
      ? { where: eq(knowledge.modelId, machine.modelId), generationId: null, modelId: machine.modelId, machineId: null }
      : { where: eq(knowledge.machineId, machine.id), generationId: null, modelId: null, machineId: machine.id };

  const titel = aufGen
    ? `Generation ${generationName ?? ""} — Troubleshooting-Guide`.trim()
    : `${modellName(machine)} — Troubleshooting-Guide`;

  await schreibeMitRevision({
    where: and(
      eq(knowledge.createdBy, userId),
      eq(knowledge.typ, "troubleshooting"),
      ziel.where,
    )!,
    userId,
    kommentar: "Guide neu generiert",
    neu: {
      typ: "troubleshooting",
      titel,
      inhalt: { guide, websuche, model },
      sourceType: "eigen",
      visibility,
      generationId: ziel.generationId,
      modelId: ziel.modelId,
      machineId: ziel.machineId,
      clubId: visibility === "club" ? (clubId ?? null) : null,
      createdBy: userId,
    },
  });
}
