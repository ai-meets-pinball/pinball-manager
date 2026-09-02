"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { termine } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import { naechsterMonatsTermin } from "@/lib/faelligkeit";
import { terminSchema } from "@/lib/validators";
import type { FormState } from "@/db/actions/form-state";

/*
  Termine (datierte Ereignisse je Gerät): Anlegen / Bearbeiten / Löschen /
  Erledigen. Spiegelt das Wartungs-CRUD (requireMachineWrite → safeParse →
  revalidate+redirect). Das Datum kommt als yyyy-mm-dd aus dem Date-Input und
  wird hier zu Date geparst. Zurück geht es in den Termine-Reiter.
*/
const STANDARD_VORLAUF = 7;

function parseDatum(wert: string): Date | null {
  const d = new Date(wert);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Wiederholung normalisieren: nur positive Monatszahl, sonst „einmalig" (null). */
function wiederholung(monate: number | undefined): number | null {
  return monate && monate > 0 ? monate : null;
}

export async function createTermin(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const { user } = await requireMachineWrite(machineId);

  const parsed = terminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const d = parsed.data;
  const datum = parseDatum(d.datum);
  if (!datum) return { error: "Bitte ein gültiges Datum angeben." };

  await db.insert(termine).values({
    machineId,
    titel: d.titel,
    notiz: d.notiz ?? null,
    datum,
    erinnerungTageVorher: d.erinnerungTageVorher ?? STANDARD_VORLAUF,
    wiederholenMonate: wiederholung(d.wiederholenMonate),
    createdBy: user.id,
  });

  revalidatePath(`/machines/${machineId}`);
  redirect(`/machines/${machineId}?bereich=termine`);
}

export async function updateTermin(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const id = String(formData.get("id"));
  await requireMachineWrite(machineId);

  const parsed = terminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const d = parsed.data;
  const datum = parseDatum(d.datum);
  if (!datum) return { error: "Bitte ein gültiges Datum angeben." };

  const vorhanden = await db.query.termine.findFirst({
    where: and(eq(termine.id, id), eq(termine.machineId, machineId)),
  });
  if (!vorhanden) return { error: "Termin nicht gefunden." };

  await db
    .update(termine)
    .set({
      titel: d.titel,
      notiz: d.notiz ?? null,
      datum,
      erinnerungTageVorher: d.erinnerungTageVorher ?? STANDARD_VORLAUF,
      wiederholenMonate: wiederholung(d.wiederholenMonate),
      // Geändertes Datum/Vorlauf → Erinnerung neu scharf stellen.
      zuletztErinnert: null,
    })
    .where(and(eq(termine.id, id), eq(termine.machineId, machineId)));

  revalidatePath(`/machines/${machineId}`);
  redirect(`/machines/${machineId}?bereich=termine`);
}

export async function deleteTermin(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const id = String(formData.get("id"));
  await requireMachineWrite(machineId);

  await db
    .delete(termine)
    .where(and(eq(termine.id, id), eq(termine.machineId, machineId)));

  revalidatePath(`/machines/${machineId}`);
  return { ok: true };
}

/** Termin erledigen: wiederkehrend rückt das Datum weiter (bleibt offen,
    Erinnerung neu scharf); einmalig wird als erledigt markiert. */
export async function erledigeTermin(formData: FormData): Promise<void> {
  const machineId = String(formData.get("machineId"));
  const id = String(formData.get("id"));
  await requireMachineWrite(machineId);

  const t = await db.query.termine.findFirst({
    where: and(eq(termine.id, id), eq(termine.machineId, machineId)),
  });
  if (!t) return;

  const wo = and(eq(termine.id, id), eq(termine.machineId, machineId));
  if (t.wiederholenMonate && t.wiederholenMonate > 0) {
    await db
      .update(termine)
      .set({
        datum: naechsterMonatsTermin(t.datum, t.wiederholenMonate),
        zuletztErinnert: null,
      })
      .where(wo);
  } else {
    await db.update(termine).set({ erledigtAm: new Date() }).where(wo);
  }

  revalidatePath(`/machines/${machineId}`);
}
