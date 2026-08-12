"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { faults } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import { mitStatusNachzug } from "@/db/machine-status-core";
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

  await mitStatusNachzug(machineId, (tx) =>
    tx.insert(faults).values({
      machineId,
      beschreibung: parsed.data.beschreibung,
      kategorie: parsed.data.kategorie ?? null,
      prioritaet: parsed.data.prioritaet,
      status: parsed.data.status,
      gemeldetVon: user.id,
    }),
  );

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

export async function deleteFault(formData: FormData): Promise<void> {
  const machineId = String(formData.get("machineId"));
  const id = String(formData.get("id"));
  await requireMachineWrite(machineId);

  await mitStatusNachzug(machineId, (tx) =>
    tx
      .delete(faults)
      .where(and(eq(faults.id, id), eq(faults.machineId, machineId))),
  );

  revalidatePath(`/machines/${machineId}`);
}
