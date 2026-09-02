"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { faultImages, faults } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import { mitStatusNachzug } from "@/db/machine-status-core";
import { benachrichtigeUeberNeuenFehler } from "@/db/whatsapp-benachrichtigung";
import { MAX_FAULT_IMAGES, uploadFaultImages } from "@/lib/storage";
import { faultSchema } from "@/lib/validators";
import type { FormState } from "@/db/actions/form-state";

export async function createFault(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  // Autorisierung erbt sich von der Maschine.
  const { user } = await requireMachineWrite(machineId);

  const parsed = faultSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  // Fotos ZUERST hochladen (Magic-Byte-/Größenprüfung) — schlägt es fehl, wird
  // gar kein Fehler angelegt, und die Meldung geht sauber an den Nutzer zurück.
  const bilder = formData.getAll("bilder") as File[];
  if (
    bilder.filter((f) => f instanceof File && f.size > 0).length >
    MAX_FAULT_IMAGES
  ) {
    return { error: `Höchstens ${MAX_FAULT_IMAGES} Bilder.` };
  }
  let urls: string[];
  try {
    urls = await uploadFaultImages(bilder, user.id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const [neu] = await mitStatusNachzug(machineId, (tx) =>
    tx
      .insert(faults)
      .values({
        machineId,
        beschreibung: parsed.data.beschreibung,
        kategorie: parsed.data.kategorie ?? null,
        prioritaet: parsed.data.prioritaet,
        status: parsed.data.status,
        gemeldetVon: user.id,
      })
      .returning({ id: faults.id }),
  );
  if (urls.length > 0) {
    await db
      .insert(faultImages)
      .values(urls.map((url) => ({ faultId: neu.id, url })));
  }

  // Best-effort: Opt-in-Owner/Admins des Clubs per WhatsApp informieren. Darf die
  // Meldung nie zurückrollen (deshalb try/catch, vor dem redirect).
  try {
    await benachrichtigeUeberNeuenFehler({
      id: neu.id,
      machineId,
      beschreibung: parsed.data.beschreibung,
      status: parsed.data.status,
    });
  } catch (e) {
    console.error("[whatsapp] Benachrichtigung fehlgeschlagen:", e);
  }

  revalidatePath(`/machines/${machineId}`);
  redirect(`/machines/${machineId}`);
}

export async function updateFault(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const id = String(formData.get("id"));
  await requireMachineWrite(machineId);

  const parsed = faultSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  await mitStatusNachzug(machineId, (tx) =>
    tx
      .update(faults)
      .set({
        beschreibung: parsed.data.beschreibung,
        kategorie: parsed.data.kategorie ?? null,
        prioritaet: parsed.data.prioritaet,
        status: parsed.data.status,
      })
      .where(and(eq(faults.id, id), eq(faults.machineId, machineId))),
  );

  revalidatePath(`/machines/${machineId}`);
  redirect(`/machines/${machineId}`);
}

export async function deleteFault(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const id = String(formData.get("id"));
  await requireMachineWrite(machineId);

  await mitStatusNachzug(machineId, (tx) =>
    tx
      .delete(faults)
      .where(and(eq(faults.id, id), eq(faults.machineId, machineId))),
  );

  revalidatePath(`/machines/${machineId}`);
  return { ok: true };
}
