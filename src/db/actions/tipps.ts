"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  generations,
  knowledge,
  knowledgeTargets,
  machineModels,
} from "@/db/schema";
import { isSuperAdmin, requireMachineWrite, requireUser } from "@/lib/session";
import { baueLinks } from "@/lib/tipp-inhalt";
import type { FormState } from "@/db/actions/form-state";

/*
  Allgemeine Tipps (typ='tipp'): frei formuliertes Wissen, das ein oder mehrere
  Modelle und/oder ganze Generationen betrifft. Angelegt wird über die eigene
  Maschine (dieselbe Schreibregel wie Handbuch/Guide); der Geltungsbereich
  liegt n:m in `knowledge_targets`. Signale, Ausblenden, Kuratierung, Verlauf
  und Sichtbarkeit laufen über die bestehende knowledge-Maschinerie.
*/
export async function createTipp(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId") ?? "");
  const titel = String(formData.get("titel") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "privat");
  const modelIds = formData.getAll("modelle").map(String).filter(Boolean);
  const generationIds = formData
    .getAll("generationen")
    .map(String)
    .filter(Boolean);
  // Weiterführende Links (index-gleiche Reihen aus LinksFeld); unsichere/leere
  // URLs fallen in baueLinks weg.
  const links = baueLinks(
    formData.getAll("linkUrl").map(String),
    formData.getAll("linkName").map(String),
    formData.getAll("linkBeschreibung").map(String),
  );

  const { user: currentUser } = await requireMachineWrite(machineId);

  if (!titel) return { error: "Titel ist erforderlich." };
  if (!text) return { error: "Der Tipp-Text ist erforderlich." };
  if (visibility !== "privat" && visibility !== "oeffentlich") {
    return { error: "Ungültige Sichtbarkeit." };
  }
  if (modelIds.length === 0 && generationIds.length === 0) {
    return { error: "Mindestens ein Modell oder eine Generation wählen." };
  }

  // Ziele gegen den Katalog prüfen — nur existierende Modelle/Generationen.
  const bekannteModelle =
    modelIds.length > 0
      ? await db
          .select({ id: machineModels.id })
          .from(machineModels)
          .where(inArray(machineModels.id, modelIds))
      : [];
  const bekannteGenerationen =
    generationIds.length > 0
      ? await db
          .select({ id: generations.id })
          .from(generations)
          .where(inArray(generations.id, generationIds))
      : [];
  if (
    bekannteModelle.length !== modelIds.length ||
    bekannteGenerationen.length !== generationIds.length
  ) {
    return { error: "Unbekanntes Ziel (Modell/Generation)." };
  }

  await db.transaction(async (tx) => {
    const [tipp] = await tx
      .insert(knowledge)
      .values({
        typ: "tipp",
        titel,
        inhalt: links.length ? { text, links } : { text },
        sourceType: "eigen",
        visibility,
        createdBy: currentUser.id,
      })
      .returning({ id: knowledge.id });
    await tx.insert(knowledgeTargets).values([
      ...modelIds.map((id) => ({ knowledgeId: tipp.id, modelId: id })),
      ...generationIds.map((id) => ({
        knowledgeId: tipp.id,
        generationId: id,
      })),
    ]);
  });

  revalidatePath(`/machines/${machineId}`);
  return { message: "Tipp angelegt." };
}

/** Eigenen Tipp löschen (Autor oder Super-Admin). Ziele, Signale, Overrides
    und Revisionen hängen per FK-Cascade am Eintrag. */
export async function deleteTipp(formData: FormData): Promise<void> {
  const id = String(formData.get("knowledgeId") ?? "");
  const machineId = String(formData.get("machineId") ?? "");
  const currentUser = await requireUser();

  const [k] = await db
    .select({ typ: knowledge.typ, createdBy: knowledge.createdBy })
    .from(knowledge)
    .where(eq(knowledge.id, id))
    .limit(1);
  if (!k || k.typ !== "tipp") return;
  if (k.createdBy !== currentUser.id && !isSuperAdmin(currentUser)) return;

  await db.delete(knowledge).where(eq(knowledge.id, id));
  if (machineId) revalidatePath(`/machines/${machineId}`);
}
