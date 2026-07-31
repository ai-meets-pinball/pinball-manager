"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { generations, machineModels } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/session";
import {
  applyGenerationCatalog,
  parseCatalog,
} from "@/lib/generation-catalog";
import type { FormState } from "@/db/actions/clubs";

/*
  Verwaltung der Generationen (Board-/Hardware-Systeme) und der Zuordnung
  Modell → Generation. Alles nur für Super-Admins (Flippermasterliste).
*/

const PFAD = "/admin/modelle";

/** Katalog-Upload: eine Export-JSON einspielen (Generationen + Zuordnung). */
export async function importGenerationCatalog(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSuperAdmin();

  const datei = formData.get("katalog");
  if (!(datei instanceof File) || datei.size === 0) {
    return { error: "Bitte eine Katalog-JSON auswählen." };
  }

  let records;
  try {
    const json = JSON.parse(await datei.text());
    records = parseCatalog(json);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "JSON konnte nicht gelesen werden." };
  }

  const r = await applyGenerationCatalog(records);
  revalidatePath(PFAD);
  return {
    message:
      `Import fertig: ${r.generationenGesamt} Generationen ` +
      `(${r.generationenNeu} neu), ${r.zugeordnet} Modelle zugeordnet, ` +
      `${r.uebersprungenManuell} manuelle übersprungen, ${r.ohneTreffer} ohne Treffer.`,
  };
}

const nameSchema = z.string().trim().min(1, "Name darf nicht leer sein.").max(120);

/** Neue Generation anlegen. */
export async function createGeneration(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSuperAdmin();
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const eingefuegt = await db
    .insert(generations)
    .values({ name: parsed.data })
    .onConflictDoNothing({ target: generations.name })
    .returning({ id: generations.id });

  revalidatePath(PFAD);
  return eingefuegt.length > 0
    ? { message: `Generation „${parsed.data}" angelegt.` }
    : { error: `„${parsed.data}" gibt es bereits.` };
}

/** Generation umbenennen. */
export async function renameGeneration(formData: FormData): Promise<void> {
  await requireSuperAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  const name = nameSchema.safeParse(formData.get("name"));
  if (!id.success || !name.success) return;
  await db.update(generations).set({ name: name.data }).where(eq(generations.id, id.data));
  revalidatePath(PFAD);
}

/** Generation löschen — die Zuordnung der Modelle entfällt (FK set null). */
export async function deleteGeneration(formData: FormData): Promise<void> {
  await requireSuperAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  await db.delete(generations).where(eq(generations.id, id.data));
  revalidatePath(PFAD);
}

/** Generation eines Modells von Hand setzen. „auto" gibt es zurück an den Import
    (generationManuell=false); jeder andere Wert ist eine Hand-Zuordnung.
    Gibt FormState zurück, damit die UI Fehler ANZEIGT statt sie zu verschlucken. */
export async function assignModelGeneration(
  formData: FormData,
): Promise<FormState> {
  await requireSuperAdmin();
  const modelId = z.string().uuid().safeParse(formData.get("modelId"));
  if (!modelId.success) return { error: "Ungültige Auswahl." };
  const wert = String(formData.get("generationId") ?? "");

  try {
    if (wert === "auto") {
      // Zurück in den Import-Modus: nächster Katalog-Import darf wieder setzen.
      await db
        .update(machineModels)
        .set({ generationManuell: false })
        .where(eq(machineModels.id, modelId.data));
    } else {
      const gid = z.string().uuid().safeParse(wert);
      await db
        .update(machineModels)
        .set({
          generationId: gid.success ? gid.data : null,
          generationManuell: true,
        })
        .where(eq(machineModels.id, modelId.data));
    }
  } catch (e) {
    console.error("[generations] assign:", (e as Error).message);
    return { error: "Speichern fehlgeschlagen. Bitte erneut versuchen." };
  }
  revalidatePath(PFAD);
  return {};
}
