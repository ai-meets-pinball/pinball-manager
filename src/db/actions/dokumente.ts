"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { machineDokumente } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import { dokumentSchema } from "@/lib/validators";
import { deleteStorageObject, uploadDocument } from "@/lib/storage";
import type { FormState } from "@/db/actions/form-state";

/*
  Dokumente je Gerät (Links / Notizen / Dateien): Anlegen / Bearbeiten / Löschen.
  Spiegelt das Termine-CRUD (requireMachineWrite → safeParse → revalidate+
  redirect). Der einzige Zusatz ist der Datei-Upload (uploadDocument) und das
  echte Löschen des Storage-Objekts beim Entfernen einer Datei.
  Copyright (CLAUDE.md §3): Datei-Upload verlangt eine Bestätigung, dass der
  Nutzer die Datei speichern darf — Handbücher gehören nicht hierher.
*/

/** Rohwerte aus dem Formular lesen; bei einem Link ohne Schema `https://`
    voranstellen, damit „example.com" als gültige URL durchgeht. */
function rohWerte(formData: FormData): Record<string, unknown> {
  const roh: Record<string, unknown> = {
    typ: formData.get("typ"),
    titel: formData.get("titel"),
    notiz: formData.get("notiz"),
    url: formData.get("url"),
  };
  if (roh.typ === "link" && typeof roh.url === "string") {
    const u = roh.url.trim();
    if (u && !/^https?:\/\//i.test(u)) roh.url = `https://${u}`;
  }
  return roh;
}

export async function createDokument(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const { user } = await requireMachineWrite(machineId);

  const parsed = dokumentSchema.safeParse(rohWerte(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const d = parsed.data;

  let url: string | null = d.typ === "link" ? (d.url ?? null) : null;
  let dateiname: string | null = null;

  if (d.typ === "datei") {
    if (formData.get("attest") !== "on") {
      return {
        error: "Bitte bestätige, dass du diese Datei speichern darfst.",
      };
    }
    const file = formData.get("datei") as File | null;
    if (!file || file.size === 0) {
      return { error: "Bitte eine Datei auswählen." };
    }
    try {
      const hoch = await uploadDocument(file, user.id);
      url = hoch.url;
      dateiname = hoch.dateiname;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Upload fehlgeschlagen." };
    }
  }

  await db.insert(machineDokumente).values({
    machineId,
    typ: d.typ,
    titel: d.titel,
    notiz: d.notiz ?? null,
    url,
    dateiname,
    createdBy: user.id,
  });

  revalidatePath(`/machines/${machineId}`);
  redirect(`/machines/${machineId}?bereich=dokumente`);
}

export async function updateDokument(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const id = String(formData.get("id"));
  const { user } = await requireMachineWrite(machineId);

  const vorhanden = await db.query.machineDokumente.findFirst({
    where: and(
      eq(machineDokumente.id, id),
      eq(machineDokumente.machineId, machineId),
    ),
  });
  if (!vorhanden) return { error: "Dokument nicht gefunden." };

  // Der Typ ist beim Bearbeiten fix — die Zeile bleibt Link/Notiz/Datei.
  const roh = rohWerte(formData);
  roh.typ = vorhanden.typ;
  const parsed = dokumentSchema.safeParse(roh);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const d = parsed.data;

  let url: string | null = vorhanden.url;
  let dateiname: string | null = vorhanden.dateiname;

  if (vorhanden.typ === "link") {
    url = d.url ?? null;
  } else if (vorhanden.typ === "datei") {
    // Datei-Ersatz ist optional: nur wenn eine neue Datei mitkommt, hochladen
    // und die alte aus dem Storage entfernen.
    const file = formData.get("datei") as File | null;
    if (file && file.size > 0) {
      if (formData.get("attest") !== "on") {
        return {
          error: "Bitte bestätige, dass du diese Datei speichern darfst.",
        };
      }
      try {
        const hoch = await uploadDocument(file, user.id);
        await deleteStorageObject(vorhanden.url);
        url = hoch.url;
        dateiname = hoch.dateiname;
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : "Upload fehlgeschlagen.",
        };
      }
    }
  }

  await db
    .update(machineDokumente)
    .set({ titel: d.titel, notiz: d.notiz ?? null, url, dateiname })
    .where(
      and(
        eq(machineDokumente.id, id),
        eq(machineDokumente.machineId, machineId),
      ),
    );

  revalidatePath(`/machines/${machineId}`);
  redirect(`/machines/${machineId}?bereich=dokumente`);
}

export async function deleteDokument(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const id = String(formData.get("id"));
  await requireMachineWrite(machineId);

  const vorhanden = await db.query.machineDokumente.findFirst({
    where: and(
      eq(machineDokumente.id, id),
      eq(machineDokumente.machineId, machineId),
    ),
  });
  // Bei einer Datei auch das Storage-Objekt entfernen (best-effort, siehe
  // deleteStorageObject) — Dokumente sollen beim Löschen wirklich verschwinden.
  if (vorhanden?.typ === "datei") {
    await deleteStorageObject(vorhanden.url);
  }

  await db
    .delete(machineDokumente)
    .where(
      and(
        eq(machineDokumente.id, id),
        eq(machineDokumente.machineId, machineId),
      ),
    );

  revalidatePath(`/machines/${machineId}`);
  return { ok: true };
}
