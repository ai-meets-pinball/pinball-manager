"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { knowledge } from "@/db/schema";
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
