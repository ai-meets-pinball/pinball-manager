"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { promptOverrides } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/session";
import { PROMPT_KEYS, type PromptKey } from "@/lib/prompts";
import type { FormState } from "@/db/actions/form-state";

/*
  KI-Prompt-Overrides bearbeiten (nur Super-Admin) — Muster wie die E-Mail-
  Vorlagen (db/actions/email-templates.ts): Speichern = Upsert einer Override-
  Zeile, Zurücksetzen = Löschen (dann greift wieder der Code-Standard). Scope
  ist exklusiv: global | Hersteller | Generation.
*/
function gueltigerKey(k: string): k is PromptKey {
  return (PROMPT_KEYS as readonly string[]).includes(k);
}

export async function savePrompt(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const currentUser = await requireSuperAdmin();
  const key = String(formData.get("key") ?? "");
  const vorlage = String(formData.get("vorlage") ?? "").trim();
  const hersteller = String(formData.get("hersteller") ?? "").trim() || null;
  const generationId =
    String(formData.get("generationId") ?? "").trim() || null;

  if (!gueltigerKey(key)) return { error: "Unbekannter Prompt." };
  if (!vorlage) return { error: "Der Prompt darf nicht leer sein." };
  if (hersteller && generationId) {
    return { error: "Bereich ist entweder Hersteller ODER Generation." };
  }

  await db
    .insert(promptOverrides)
    .values({
      key,
      hersteller,
      generationId,
      vorlage,
      updatedBy: currentUser.id,
    })
    .onConflictDoUpdate({
      target: [
        promptOverrides.key,
        promptOverrides.hersteller,
        promptOverrides.generationId,
      ],
      set: { vorlage, updatedAt: new Date(), updatedBy: currentUser.id },
    });

  revalidatePath("/admin/prompts");
  return { message: "Prompt gespeichert." };
}

export async function resetPrompt(formData: FormData): Promise<void> {
  await requireSuperAdmin();
  const key = String(formData.get("key") ?? "");
  const hersteller = String(formData.get("hersteller") ?? "").trim() || null;
  const generationId =
    String(formData.get("generationId") ?? "").trim() || null;
  if (!gueltigerKey(key)) return;

  await db
    .delete(promptOverrides)
    .where(
      and(
        eq(promptOverrides.key, key),
        hersteller
          ? eq(promptOverrides.hersteller, hersteller)
          : isNull(promptOverrides.hersteller),
        generationId
          ? eq(promptOverrides.generationId, generationId)
          : isNull(promptOverrides.generationId),
      ),
    );

  revalidatePath("/admin/prompts");
}
