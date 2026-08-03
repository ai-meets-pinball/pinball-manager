"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { knowledge, knowledgeOverrides, knowledgeSignals } from "@/db/schema";
import { knowledgeSichtbarFuer } from "@/db/queries";
import { isSuperAdmin, kannKuratieren, requireUser } from "@/lib/session";
import type { FormState } from "@/db/actions/clubs";

/*
  Datenmodell-Redesign (Phase 1): Sichtbarkeit eines Wissenseintrags ändern.
  Das ersetzt das frühere „Fakten teilen" — die Sichtbarkeit ist jetzt eine
  Eigenschaft des Eintrags (privat|club|oeffentlich), nicht ein separates Share.
  Nur der Autor (oder Super-Admin) darf sie ändern. „club" behält den bestehenden
  Club-Anker; ein Club-Picker kommt später (Phase 5) — der Control bietet vorerst
  privat/öffentlich.
*/
export async function setKnowledgeVisibility(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const machineId = String(formData.get("machineId") ?? "");
  const v = String(formData.get("visibility") ?? "");
  if (v !== "privat" && v !== "club" && v !== "oeffentlich") {
    return { error: "Ungültige Sichtbarkeit." };
  }

  const currentUser = await requireUser();
  const [k] = await db
    .select({ createdBy: knowledge.createdBy })
    .from(knowledge)
    .where(eq(knowledge.id, id))
    .limit(1);
  if (!k) return { error: "Wissenseintrag nicht gefunden." };
  if (k.createdBy !== currentUser.id && !isSuperAdmin(currentUser)) {
    return { error: "Nur der Autor darf die Sichtbarkeit ändern." };
  }

  await db
    .update(knowledge)
    .set(
      v === "club"
        ? { visibility: v, updatedAt: new Date() } // Club-Anker unverändert lassen
        : { visibility: v, clubId: null, updatedAt: new Date() },
    )
    .where(eq(knowledge.id, id));

  if (machineId) revalidatePath(`/machines/${machineId}`);
  return { message: "Sichtbarkeit geändert." };
}

/*
  Persönliches Ausblenden (Phase 5): einen fremden, sichtbaren Wissenseintrag
  für sich ausblenden bzw. wieder einblenden. Rein persönlich — ändert nichts für
  andere. Den eigenen Eintrag blendet man nicht aus (Verwaltung via Sichtbarkeit).
*/
export async function setKnowledgeOverride(formData: FormData): Promise<void> {
  const id = String(formData.get("knowledgeId") ?? "");
  const machineId = String(formData.get("machineId") ?? "");
  const hide = String(formData.get("hide") ?? "") === "true";
  const currentUser = await requireUser();

  const [k] = await db
    .select({ createdBy: knowledge.createdBy })
    .from(knowledge)
    .where(eq(knowledge.id, id))
    .limit(1);
  if (!k) return;
  if (k.createdBy === currentUser.id) return; // eigenen Eintrag nicht ausblenden
  if (!(await knowledgeSichtbarFuer(currentUser, id))) return;

  if (hide) {
    await db
      .insert(knowledgeOverrides)
      .values({ knowledgeId: id, userId: currentUser.id })
      .onConflictDoNothing();
  } else {
    await db
      .delete(knowledgeOverrides)
      .where(
        and(
          eq(knowledgeOverrides.knowledgeId, id),
          eq(knowledgeOverrides.userId, currentUser.id),
        ),
      );
  }

  if (machineId) revalidatePath(`/machines/${machineId}`);
}

/*
  Kuratoren-Moderation: einen geteilten Wissenseintrag FÜR ALLE verbergen — nur
  mit Begründung, reversibel (restoreKnowledge). Der Autor sowie Kuratoren und
  Super-Admins sehen den Eintrag weiterhin, markiert samt Grund (kein stilles
  Zensieren). Die Melde-Warnung bleibt davon unabhängig rein anzeigend.
*/
export async function hideKnowledge(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("knowledgeId") ?? "");
  const machineId = String(formData.get("machineId") ?? "");
  const grund = String(formData.get("grund") ?? "").trim();

  const currentUser = await requireUser();
  if (!kannKuratieren(currentUser)) {
    return { error: "Nur Kuratoren dürfen Einträge verbergen." };
  }
  if (!grund) return { error: "Eine Begründung ist erforderlich." };
  if (!(await knowledgeSichtbarFuer(currentUser, id))) {
    return { error: "Wissenseintrag nicht gefunden." };
  }

  await db
    .update(knowledge)
    // updatedAt bewusst unangetastet — Verbergen ist keine inhaltliche Änderung
    // und soll die Sortierung nicht verschieben.
    .set({ verborgenAm: new Date(), verborgenVon: currentUser.id, verborgenGrund: grund })
    .where(eq(knowledge.id, id));

  if (machineId) revalidatePath(`/machines/${machineId}`);
  revalidatePath("/kuratierung");
  return { message: "Eintrag verborgen." };
}

/** Einen verborgenen Wissenseintrag wiederherstellen (Kurator/Super-Admin). */
export async function restoreKnowledge(formData: FormData): Promise<void> {
  const id = String(formData.get("knowledgeId") ?? "");
  const machineId = String(formData.get("machineId") ?? "");

  const currentUser = await requireUser();
  if (!kannKuratieren(currentUser)) return;
  if (!(await knowledgeSichtbarFuer(currentUser, id))) return;

  await db
    .update(knowledge)
    .set({ verborgenAm: null, verborgenVon: null, verborgenGrund: null })
    .where(eq(knowledge.id, id));

  if (machineId) revalidatePath(`/machines/${machineId}`);
  revalidatePath("/kuratierung");
}

/*
  Community-Signal (Phase 5): einen Wissenseintrag als „hilfreich" oder „falsch"
  markieren. Genau ein Signal je Nutzer und Eintrag; `wert='aus'` entfernt es.
  Man signalisiert nur, was man sehen darf, und nicht den EIGENEN Eintrag.
*/
export async function setKnowledgeSignal(formData: FormData): Promise<void> {
  const id = String(formData.get("knowledgeId") ?? "");
  const wert = String(formData.get("wert") ?? "");
  const machineId = String(formData.get("machineId") ?? "");
  const currentUser = await requireUser();

  const [k] = await db
    .select({ createdBy: knowledge.createdBy })
    .from(knowledge)
    .where(eq(knowledge.id, id))
    .limit(1);
  if (!k) return;
  if (k.createdBy === currentUser.id) return; // eigenen Eintrag nicht bewerten
  if (!(await knowledgeSichtbarFuer(currentUser, id))) return;

  if (wert === "hilfreich" || wert === "falsch") {
    await db
      .insert(knowledgeSignals)
      .values({ knowledgeId: id, userId: currentUser.id, wert })
      .onConflictDoUpdate({
        target: [knowledgeSignals.knowledgeId, knowledgeSignals.userId],
        set: { wert },
      });
  } else {
    await db
      .delete(knowledgeSignals)
      .where(
        and(
          eq(knowledgeSignals.knowledgeId, id),
          eq(knowledgeSignals.userId, currentUser.id),
        ),
      );
  }

  if (machineId) revalidatePath(`/machines/${machineId}`);
}
