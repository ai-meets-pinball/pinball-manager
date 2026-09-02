"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { machines } from "@/db/schema";
import { aktualisiereMaschinenStatus } from "@/db/machine-status-core";
import { requireMachineWrite } from "@/lib/session";
import { machineStatusSchema } from "@/lib/validators";
import type { FormState } from "@/db/actions/form-state";

/*
  Betriebsstatus einer Maschine — die GATE-behafteten Formular-Actions.

  Der eigentliche Nachzug (`mitStatusNachzug`, `aktualisiereMaschinenStatus`)
  liegt bewusst in db/machine-status-core.ts OHNE "use server": gate-lose
  Helfer dürfen nicht als Server Actions von außen erreichbar sein. Fehler- und
  Reparatur-Mutationen importieren `mitStatusNachzug` von dort.
*/

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
    .select({
      status: machines.status,
      manuell: machines.statusManuell,
      grund: machines.statusGrund,
    })
    .from(machines)
    .where(eq(machines.id, machineId))
    .limit(1);

  // Ein No-op (schon manuell, gleicher Status, gleicher Grund) schreibt nichts —
  // sonst würde jedes „Setzen" Autor und Zeitstempel still überschreiben.
  if (
    aktuell?.manuell &&
    aktuell.status === parsed.data.status &&
    (aktuell.grund ?? "") === (parsed.data.grund || "")
  ) {
    return { ok: true };
  }

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
