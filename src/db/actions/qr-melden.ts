"use server";

import { faults } from "@/db/schema";
import { mitStatusNachzug } from "@/db/actions/machine-status";
import { getMachineByQrToken } from "@/db/queries";
import { getCurrentUser } from "@/lib/session";
import type { FormState } from "@/db/actions/form-state";

/*
  Fehler melden über den QR-Code der Maschine — die EINZIGE Schreib-Aktion, die
  ohne Maschinen-Zugriffsrecht funktioniert. Die Berechtigung ist der Besitz
  des Tokens (wer vor dem Gerät steht, darf melden):
  - Angemeldete Nutzer melden unter ihrem Konto (gemeldetVon).
  - Gäste geben nur einen Namen an (gemeldetVonName; Anzeige „… (Gast)").
  Bewusst OHNE Prioritäts-/Statuswahl: Gäste beschreiben das Symptom, die
  Einordnung (Triage) bleibt beim Betreiber — auch damit ein Scherzbold nicht
  per „kritisch" den Betriebsstatus der Maschine kippen kann.
*/
// Kurzer Melde-Code (12 Hex-Zeichen; großzügig 8–32 zugelassen).
const CODE_RE = /^[0-9a-f]{8,32}$/i;

export async function meldeFehlerPerQr(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const token = String(formData.get("token") ?? "").trim();
  const beschreibung = String(formData.get("beschreibung") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!CODE_RE.test(token)) return { error: "Ungültiger QR-Code." };
  const machine = await getMachineByQrToken(token);
  if (!machine) return { error: "Ungültiger QR-Code." };

  if (!beschreibung) return { error: "Bitte beschreibe den Fehler." };
  if (beschreibung.length > 2000) {
    return { error: "Die Beschreibung ist zu lang (max. 2000 Zeichen)." };
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    if (!name) return { error: "Bitte gib deinen Namen an." };
    if (name.length > 100) return { error: "Der Name ist zu lang." };
  }

  // Wie jede Fehler-Mutation: Anlegen + Betriebsstatus-Nachzug in EINEM Vorgang.
  await mitStatusNachzug(machine.id, (tx) =>
    tx.insert(faults).values({
      machineId: machine.id,
      beschreibung,
      gemeldetVon: currentUser?.id ?? null,
      gemeldetVonName: currentUser ? null : name,
    }),
  );

  return {
    message: "Danke! Der Fehler ist gemeldet und wird geprüft.",
  };
}
