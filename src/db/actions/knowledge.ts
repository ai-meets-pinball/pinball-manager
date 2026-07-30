"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { knowledge, knowledgeSignals } from "@/db/schema";
import { knowledgeSichtbarFuer } from "@/db/queries";
import { isSuperAdmin, requireUser } from "@/lib/session";
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
