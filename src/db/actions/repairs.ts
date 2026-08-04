"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { faults, repairFaults, repairs } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import { aktualisiereMaschinenStatus } from "@/db/actions/machine-status";
import { repairSchema } from "@/lib/validators";

export type FormState = { error?: string };

/* Die gewählten Fehler einlesen (Mehrfachauswahl) und prüfen, dass ALLE wirklich
   zu dieser Maschine gehören — sonst könnte man über eine eigene Maschine fremde
   Fehler „beheben". Gibt die (deduplizierten) IDs zurück. */
async function resolveFaultIds(
  formData: FormData,
  machineId: string,
): Promise<{ ids: string[] } | { error: string }> {
  const ids = [
    ...new Set(formData.getAll("faultIds").map(String).filter(Boolean)),
  ];
  if (ids.length === 0) return { ids: [] };

  const vorhanden = await db.query.faults.findMany({
    where: and(eq(faults.machineId, machineId), inArray(faults.id, ids)),
    columns: { id: true },
  });
  if (vorhanden.length !== ids.length) {
    return { error: "Ein gewählter Fehler gehört nicht zu dieser Maschine" };
  }
  return { ids };
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

  const faultRes = await resolveFaultIds(formData, machineId);
  if ("error" in faultRes) return faultRes;
  const faultIds = faultRes.ids;

  // Das Symptom wird NICHT kopiert — es lebt am Fehler. Hier nur die Verknüpfung.
  // `faultId` bleibt als „primärer" Fehler gesetzt (geteilte Ansicht zeigt eins).
  await db.transaction(async (tx) => {
    const [rep] = await tx
      .insert(repairs)
      .values({
        machineId,
        faultId: faultIds[0] ?? null,
        diagnose: data.diagnose ?? null,
        massnahme: data.massnahme ?? null,
        teile: data.teile ?? null,
        kosten: data.kosten ?? null,
        zeit: data.zeit ?? null,
        status: data.status,
      })
      .returning({ id: repairs.id });

    if (faultIds.length > 0) {
      await tx
        .insert(repairFaults)
        .values(faultIds.map((fid) => ({ repairId: rep.id, faultId: fid })));
    }

    // Schlüsselregel: erledigte Reparatur → ALLE verknüpften Fehler behoben.
    if (data.status === "erledigt" && faultIds.length > 0) {
      await tx
        .update(faults)
        .set({ status: "behoben" })
        .where(inArray(faults.id, faultIds));
    }
  });

  // Eine erledigte Reparatur kann einen kritischen Fehler geräumt haben.
  await aktualisiereMaschinenStatus(machineId);
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

  // Die Reparatur muss zu DIESER Maschine gehören (sonst über eine eigene
  // Maschine fremde repairId manipulieren).
  const bestehend = await db.query.repairs.findFirst({
    where: and(eq(repairs.id, id), eq(repairs.machineId, machineId)),
    columns: { id: true },
  });
  if (!bestehend) return { error: "Reparatur nicht gefunden." };

  const faultRes = await resolveFaultIds(formData, machineId);
  if ("error" in faultRes) return faultRes;
  const faultIds = faultRes.ids;

  await db.transaction(async (tx) => {
    await tx
      .update(repairs)
      .set({
        faultId: faultIds[0] ?? null,
        diagnose: data.diagnose ?? null,
        massnahme: data.massnahme ?? null,
        teile: data.teile ?? null,
        kosten: data.kosten ?? null,
        zeit: data.zeit ?? null,
        status: data.status,
      })
      .where(eq(repairs.id, id));

    // Verknüpfungen neu setzen (Auswahl kann sich geändert haben).
    await tx.delete(repairFaults).where(eq(repairFaults.repairId, id));
    if (faultIds.length > 0) {
      await tx
        .insert(repairFaults)
        .values(faultIds.map((fid) => ({ repairId: id, faultId: fid })));
    }

    if (data.status === "erledigt" && faultIds.length > 0) {
      await tx
        .update(faults)
        .set({ status: "behoben" })
        .where(inArray(faults.id, faultIds));
    }
  });

  await aktualisiereMaschinenStatus(machineId);
  revalidatePath(`/machines/${machineId}`);
  redirect(`/machines/${machineId}`);
}

export async function deleteRepair(formData: FormData): Promise<void> {
  const machineId = String(formData.get("machineId"));
  const id = String(formData.get("id"));
  await requireMachineWrite(machineId);

  // repair_faults hängt per FK (cascade) an der Reparatur und geht mit weg.
  await db
    .delete(repairs)
    .where(and(eq(repairs.id, id), eq(repairs.machineId, machineId)));

  // BEWUSST kein aktualisiereMaschinenStatus: das Löschen einer Reparatur
  // öffnet keinen behobenen Fehler wieder — der Status ändert sich nicht.
  revalidatePath(`/machines/${machineId}`);
}
