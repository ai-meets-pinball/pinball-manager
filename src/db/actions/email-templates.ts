"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { emailTemplates } from "@/db/schema";
import {
  DEFAULT_TEMPLATES,
  TEMPLATE_KEYS,
  type TemplateKey,
} from "@/lib/email-templates";
import { requireSuperAdmin } from "@/lib/session";
import type { FormState } from "@/db/actions/clubs";

const schema = z.object({
  key: z.enum(TEMPLATE_KEYS),
  subject: z.string().trim().min(1, "Betreff ist erforderlich"),
  body: z.string().trim().min(1, "Text ist erforderlich"),
});

/** Vorlage speichern (nur Super-Admin). Legt bei Bedarf die Zeile an. */
export async function saveEmailTemplate(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const currentUser = await requireSuperAdmin();

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const { key, subject, body } = parsed.data;

  await db
    .insert(emailTemplates)
    .values({ key, subject, body, updatedBy: currentUser.id })
    .onConflictDoUpdate({
      target: emailTemplates.key,
      set: { subject, body, updatedAt: new Date(), updatedBy: currentUser.id },
    });

  revalidatePath("/admin");
  return { message: "Vorlage gespeichert." };
}

/** Auf den Standardtext zurücksetzen = gespeicherte Abweichung löschen. */
export async function resetEmailTemplate(formData: FormData): Promise<void> {
  await requireSuperAdmin();
  const key = String(formData.get("key")) as TemplateKey;
  if (!TEMPLATE_KEYS.includes(key)) throw new Error("Unbekannte Vorlage");

  await db.delete(emailTemplates).where(eq(emailTemplates.key, key));
  revalidatePath("/admin");
}

/** Standardtext (für „Zurücksetzen"-Vorschau im Client). */
export async function defaultTemplate(key: TemplateKey) {
  return DEFAULT_TEMPLATES[key];
}
