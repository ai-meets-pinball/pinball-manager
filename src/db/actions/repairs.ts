"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { faults, repairFaults, repairs, shares } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import { mitStatusNachzug, type Tx } from "@/db/machine-status-core";
import { repairSchema } from "@/lib/validators";
import {
  fehlerStatusNachReparatur,
  type FehlerStatus,
  type ReparaturStatus,
} from "@/lib/fehler-status";
import type { FormState } from "@/db/actions/form-state";

type FehlerMitStatus = { id: string; status: FehlerStatus };

/* Die gewählten Fehler einlesen (Mehrfachauswahl) und prüfen, dass ALLE wirklich
   zu dieser Maschine gehören — sonst könnte man über eine eigene Maschine fremde
   Fehler „beheben". Gibt die (deduplizierten) Fehler mit ihrem aktuellen Status
   zurück — den braucht die Nachzug-Regel. */
async function resolveFaults(
  formData: FormData,
  machineId: string,
): Promise<{ fehler: FehlerMitStatus[] } | { error: string }> {
  const ids = [
    ...new Set(formData.getAll("faultIds").map(String).filter(Boolean)),
  ];
  if (ids.length === 0) return { fehler: [] };

  const vorhanden = await db.query.faults.findMany({
    where: and(eq(faults.machineId, machineId), inArray(faults.id, ids)),
    columns: { id: true, status: true },
  });
  if (vorhanden.length !== ids.length) {
    return { error: "Ein gewählter Fehler gehört nicht zu dieser Maschine" };
  }
  return { fehler: vorhanden };
}

/* Schlüsselregel: die Reparatur führt den Status der verknüpften Fehler
   („erledigt" → behoben, „in Arbeit" → in Arbeit für noch offene). Die
   Entscheidung trifft lib/fehler-status.ts; hier nur die Updates, und nur dort,
   wo die Regel einen neuen Status liefert. */
async function fehlerNachziehen(
  tx: Tx,
  fehler: FehlerMitStatus[],
  reparaturStatus: ReparaturStatus,
) {
  for (const f of fehler) {
    const neu = fehlerStatusNachReparatur(reparaturStatus, f.status);
    if (neu) {
      await tx.update(faults).set({ status: neu }).where(eq(faults.id, f.id));
    }
  }
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

  const faultRes = await resolveFaults(formData, machineId);
  if ("error" in faultRes) return faultRes;
  const faultIds = faultRes.fehler.map((f) => f.id);

  // Das Symptom wird NICHT kopiert — es lebt am Fehler. Hier nur die Verknüpfung.
  // `faultId` bleibt als „primärer" Fehler gesetzt (geteilte Ansicht zeigt eins).
  await mitStatusNachzug(machineId, async (tx) => {
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

    await fehlerNachziehen(tx, faultRes.fehler, data.status);
  });

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

  const faultRes = await resolveFaults(formData, machineId);
  if ("error" in faultRes) return faultRes;
  const faultIds = faultRes.fehler.map((f) => f.id);

  await mitStatusNachzug(machineId, async (tx) => {
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

    await fehlerNachziehen(tx, faultRes.fehler, data.status);
  });

  revalidatePath(`/machines/${machineId}`);
  redirect(`/machines/${machineId}`);
}

export async function deleteRepair(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const id = String(formData.get("id"));
  await requireMachineWrite(machineId);

  // repair_faults hängt per FK (cascade) an der Reparatur und geht mit weg.
  // Eine Freigabe NICHT: `shares.artefakt_id` ist polymorph und ohne FK, sie
  // bliebe als Waise stehen — darum hier in derselben Transaktion abräumen.
  await db.transaction(async (tx) => {
    await tx
      .delete(shares)
      .where(and(eq(shares.artefaktTyp, "repair"), eq(shares.artefaktId, id)));
    await tx
      .delete(repairs)
      .where(and(eq(repairs.id, id), eq(repairs.machineId, machineId)));
  });

  // BEWUSST ohne mitStatusNachzug: das Löschen einer Reparatur
  // öffnet keinen behobenen Fehler wieder — der Status ändert sich nicht.
  revalidatePath(`/machines/${machineId}`);
  return { ok: true };
}
