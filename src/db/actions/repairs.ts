"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { faults, repairs } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import { repairSchema } from "@/lib/validators";

export type FormState = { error?: string };

/* Prüft, dass ein optional verknüpfter Fehler wirklich zu dieser Maschine gehört. */
async function assertFaultBelongsToMachine(
  faultId: string | undefined,
  machineId: string,
) {
  if (!faultId) return true;
  const fault = await db.query.faults.findFirst({
    where: and(eq(faults.id, faultId), eq(faults.machineId, machineId)),
  });
  return Boolean(fault);
}

export async function createRepair(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  await requireMachineWrite(machineId);

  const parsed = repairSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const data = parsed.data;

  if (!(await assertFaultBelongsToMachine(data.faultId, machineId))) {
    return { error: "Der gewählte Fehler gehört nicht zu dieser Maschine" };
  }

  // Das Symptom wird NICHT kopiert — es lebt am Fehler. Hier nur die Verknüpfung.
  await db.insert(repairs).values({
    machineId,
    faultId: data.faultId ?? null,
    diagnose: data.diagnose ?? null,
    massnahme: data.massnahme ?? null,
    teile: data.teile ?? null,
    kosten: data.kosten ?? null,
    zeit: data.zeit ?? null,
    status: data.status,
  });

  // Schlüsselregel: erledigte Reparatur an einem Fehler → Fehler gilt als behoben.
  if (data.faultId && data.status === "erledigt") {
    await db
      .update(faults)
      .set({ status: "behoben" })
      .where(eq(faults.id, data.faultId));
  }

  revalidatePath(`/machines/${machineId}`);
  redirect(`/machines/${machineId}`);
}

export async function updateRepair(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const id = String(formData.get("id"));
  await requireMachineWrite(machineId);

  const parsed = repairSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const data = parsed.data;

  if (!(await assertFaultBelongsToMachine(data.faultId, machineId))) {
    return { error: "Der gewählte Fehler gehört nicht zu dieser Maschine" };
  }

  await db
    .update(repairs)
    .set({
      faultId: data.faultId ?? null,
      diagnose: data.diagnose ?? null,
      massnahme: data.massnahme ?? null,
      teile: data.teile ?? null,
      kosten: data.kosten ?? null,
      zeit: data.zeit ?? null,
      status: data.status,
    })
    .where(and(eq(repairs.id, id), eq(repairs.machineId, machineId)));

  if (data.faultId && data.status === "erledigt") {
    await db
      .update(faults)
      .set({ status: "behoben" })
      .where(eq(faults.id, data.faultId));
  }

  revalidatePath(`/machines/${machineId}`);
  redirect(`/machines/${machineId}`);
}

export async function deleteRepair(formData: FormData): Promise<void> {
  const machineId = String(formData.get("machineId"));
  const id = String(formData.get("id"));
  await requireMachineWrite(machineId);

  await db
    .delete(repairs)
    .where(and(eq(repairs.id, id), eq(repairs.machineId, machineId)));

  revalidatePath(`/machines/${machineId}`);
}
