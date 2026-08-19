"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { machineAusstattung } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import type { FormState } from "@/db/actions/form-state";

/*
  Ausstattung/Add-ons je Maschine — anlegen und entfernen. Eine reine
  1:n-Liste (Name + optionale Notiz, keine Kategorie, kein Katalog). Beide
  Aktionen gaten zuerst requireMachineWrite und schreiben maschinen-scoped; die
  Inline-Liste lädt über revalidatePath neu (kein Redirect — Vorbild ist
  db/actions/maintenance.ts createTask/deleteTask).
*/

const ausstattungSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt").max(120, "Name ist zu lang"),
  notiz: z
    .string()
    .trim()
    .max(300, "Notiz ist zu lang")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export async function addAusstattung(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  await requireMachineWrite(machineId);

  const parsed = ausstattungSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  await db.insert(machineAusstattung).values({
    machineId,
    name: parsed.data.name,
    notiz: parsed.data.notiz,
  });

  revalidatePath(`/machines/${machineId}`);
  return { ok: true };
}

export async function removeAusstattung(formData: FormData): Promise<void> {
  const machineId = String(formData.get("machineId"));
  const id = String(formData.get("id"));
  await requireMachineWrite(machineId);

  await db
    .delete(machineAusstattung)
    .where(
      and(
        eq(machineAusstattung.id, id),
        eq(machineAusstattung.machineId, machineId),
      ),
    );

  revalidatePath(`/machines/${machineId}`);
}
