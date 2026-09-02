"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { getFamilie } from "@/db/queries/familie";
import { generations, machineModels } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/session";
import type { FormState } from "@/db/actions/form-state";

/*
  Verwaltung der Generationen (Board-/Hardware-Systeme) und der Zuordnung
  Modell → Generation. Alles nur für Super-Admins (Modelle-Bereich).

  Der frühere Katalog-Import (Export-JSON-Upload) ist entfernt — die Erstbefüllung
  ist erledigt (Skripte scripts/import-models.mjs + seed-generations.mjs bleiben
  als Dokumentation); ab jetzt wird ausschließlich manuell gepflegt.
*/

/* Generationen-Änderungen betreffen BEIDE Seiten: die Generationen-Liste und
   die Modell-Zeilen (zeigen den Generation-Namen). */
const PFADE = ["/admin/modelle", "/admin/generationen"];
const revalidiere = () => PFADE.forEach((p) => revalidatePath(p));

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

  revalidiere();
  // `ok` statt Erfolgstext: der Anlegen-Dialog schließt bei Erfolg (ActionDialog);
  // die neue Zeile erscheint durch die Revalidierung in der Liste.
  return eingefuegt.length > 0
    ? { ok: true }
    : { error: `„${parsed.data}" gibt es bereits.` };
}

/** Generation umbenennen. Gibt FormState zurück, damit der Dialog Fehler
    (leerer Name, Namenskonflikt) anzeigen und sich bei Erfolg (`ok`) schließen kann. */
export async function renameGeneration(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSuperAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Ungültige Generation." };
  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) return { error: name.error.issues[0]?.message };

  try {
    await db
      .update(generations)
      .set({ name: name.data })
      .where(eq(generations.id, id.data));
  } catch (e) {
    // Häufigster Fall: Unique-Konflikt (generations.name).
    console.error("[generations] rename:", (e as Error).message);
    return { error: `„${name.data}" gibt es bereits.` };
  }
  revalidiere();
  return { ok: true };
}

/** Generation löschen — die Zuordnung der Modelle entfällt (FK set null).
    FormState statt void, damit eine Ablehnung unter dem Papierkorb steht
    (ActionForm) und nicht still verschwindet. */
export async function deleteGeneration(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSuperAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Ungültige Generation." };
  await db.delete(generations).where(eq(generations.id, id.data));
  revalidiere();
  return { ok: true };
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
    // Baugleiche Editionen (Familie, lib/opdb-ref.ts) haben dieselbe Hardware —
    // die Zuordnung gilt für alle Zeilen der Familie, sonst drifteten LE und
    // Premium/LE auseinander.
    const { ids } = await getFamilie(modelId.data);
    if (wert === "auto") {
      // Zurück in den Import-Modus: nächster Katalog-Import darf wieder setzen.
      await db
        .update(machineModels)
        .set({ generationManuell: false })
        .where(inArray(machineModels.id, ids));
    } else {
      const gid = z.string().uuid().safeParse(wert);
      await db
        .update(machineModels)
        .set({
          generationId: gid.success ? gid.data : null,
          generationManuell: true,
        })
        .where(inArray(machineModels.id, ids));
    }
  } catch (e) {
    console.error("[generations] assign:", (e as Error).message);
    return { error: "Speichern fehlgeschlagen. Bitte erneut versuchen." };
  }
  revalidiere();
  return {};
}
