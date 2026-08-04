"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { faults, machines } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import { machineStatusSchema } from "@/lib/validators";
import type { FormState } from "@/db/actions/clubs";

/*
  Betriebsstatus einer Maschine (Dashboard) — HYBRID:
  - `statusManuell=false`: der Status wird aus den offenen Fehlern abgeleitet
    (irgendein OFFENER kritischer Fehler → „eingeschränkt", sonst „spielbereit").
    `aktualisiereMaschinenStatus` läuft nach jeder Fehler-/Reparatur-Mutation.
  - `statusManuell=true`: von Hand gepinnt (mit Begründung) — die Automatik
    rührt ihn NICHT an, bis „Zurück auf Automatik" gewählt wird.
  `statusSeit` wird nur bei ECHTER Änderung gebumpt, damit der „Seit"-Ticker
  ehrlich bleibt.
*/

/** Effektivstatus neu berechnen (No-Op, wenn manuell gepinnt). */
export async function aktualisiereMaschinenStatus(
  machineId: string,
): Promise<void> {
  const [m] = await db
    .select({ status: machines.status, manuell: machines.statusManuell })
    .from(machines)
    .where(eq(machines.id, machineId))
    .limit(1);
  if (!m || m.manuell) return;

  const offeneKritische = await db.query.faults.findFirst({
    where: and(
      eq(faults.machineId, machineId),
      eq(faults.prioritaet, "kritisch"),
      ne(faults.status, "behoben"),
    ),
    columns: { id: true },
  });
  const neu = offeneKritische ? "eingeschraenkt" : "spielbereit";
  if (neu === m.status) return;

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
