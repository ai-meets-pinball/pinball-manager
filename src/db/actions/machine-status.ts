"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { faults, machines } from "@/db/schema";
import { naechsterStatus } from "@/lib/betriebsstatus";
import { requireMachineWrite } from "@/lib/session";
import { machineStatusSchema } from "@/lib/validators";
import type { FormState } from "@/db/actions/form-state";

/*
  Betriebsstatus einer Maschine — Laden und Schreiben. Die REGEL (abgeleitet vs.
  gepinnt, wann sich überhaupt etwas ändert) liegt rein in lib/betriebsstatus.ts
  und ist dort direkt getestet.

  `aktualisiereMaschinenStatus` läuft nach jeder Fehler-/Reparatur-Mutation —
  diese Pflicht tragen weiterhin die Aufrufer in faults.ts und repairs.ts.
*/

/** Effektivstatus neu berechnen (No-Op, wenn manuell gepinnt). */
export async function aktualisiereMaschinenStatus(
  machineId: string,
): Promise<void> {
  const [m] = await db
    .select({ status: machines.status, statusManuell: machines.statusManuell })
    .from(machines)
    .where(eq(machines.id, machineId))
    .limit(1);
  if (!m) return;

  // Die Fehler kommen ungefiltert herein: WELCHE einen Betrieb einschränken,
  // entscheidet lib/betriebsstatus.ts — nicht die WHERE-Klausel.
  const fehler = await db
    .select({ prioritaet: faults.prioritaet, status: faults.status })
    .from(faults)
    .where(eq(faults.machineId, machineId));

  const neu = naechsterStatus(m, fehler);
  if (neu === null) return;

  await db
    .update(machines)
    .set({ status: neu, statusSeit: new Date(), statusGrund: null, statusVon: null })
    .where(eq(machines.id, machineId));
}

/** Status von Hand setzen (pinnt ihn). Nur mit Schreibrecht auf die Maschine. */
export async function setzeMaschinenStatus(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId") ?? "");
  const { user } = await requireMachineWrite(machineId);

  const parsed = machineStatusSchema.safeParse({
    status: formData.get("status"),
    grund: formData.get("grund"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  const [aktuell] = await db
    .select({ status: machines.status, manuell: machines.statusManuell })
    .from(machines)
    .where(eq(machines.id, machineId))
    .limit(1);

  // statusSeit nur bumpen, wenn sich der Status wirklich ändert.
  const geaendert = !aktuell || aktuell.status !== parsed.data.status;
  await db
    .update(machines)
    .set({
      status: parsed.data.status,
      statusManuell: true,
      statusGrund: parsed.data.grund || null,
      statusVon: user.id,
      ...(geaendert ? { statusSeit: new Date() } : {}),
    })
    .where(eq(machines.id, machineId));

  revalidatePath(`/machines/${machineId}`);
  return { message: "Status gesetzt." };
}

/** Manuelle Pinnung lösen und wieder aus den Fehlern ableiten. */
export async function statusAufAutomatik(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId") ?? "");
  await requireMachineWrite(machineId);

  await db
    .update(machines)
    .set({ statusManuell: false, statusGrund: null, statusVon: null })
    .where(eq(machines.id, machineId));
  await aktualisiereMaschinenStatus(machineId);

  revalidatePath(`/machines/${machineId}`);
  return { message: "Status folgt wieder automatisch den Fehlern." };
}
