"use server";

import { revalidatePath } from "next/cache";
import { requireMachineAccess } from "@/lib/session";
import { parseImportedFacts } from "@/lib/import-facts";
import { upsertModelKnowledge } from "@/lib/facts-store";
import type { FormState } from "@/db/actions/clubs";

/*
  Import bereits extrahierter Handbuch-Fakten als JSON — die Alternative zum
  KI-/PDF-Upload für Nutzer, die die Extraktion selbst (z. B. in ChatGPT)
  gemacht haben. KEIN PDF, KEINE Attestation: es werden nur strukturierte Fakten
  entgegengenommen. Validierung/Normalisierung in lib/import-facts.ts (dieselbe
  Funktion prüft auch die Client-Vorschau); geschrieben über upsertModelKnowledge
  als Modell-Wissen (Replace-Semantik wie beim PDF-Pfad).
*/
export async function importManualFacts(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId") ?? "");
  const raw = String(formData.get("json") ?? "");

  // Schreibrecht wie beim PDF-Upload (Eigentümer/Club-Manager/Super-Admin).
  const { user, machine, darf } = await requireMachineAccess(machineId);
  if (!darf.bearbeiten) {
    return { error: "Kein Schreibzugriff auf diese Maschine." };
  }

  const pruefung = parseImportedFacts(raw);
  if (!pruefung.ok || !pruefung.result) {
    return { error: pruefung.errors[0] ?? "Keine importierbaren Tabellen im JSON gefunden." };
  }

  const rohSicht = String(formData.get("visibility") ?? "");
  const visibility: "privat" | "club" | "oeffentlich" =
    rohSicht === "club" || rohSicht === "oeffentlich" ? rohSicht : "privat";

  // Datenmodell-Redesign: als MODELL-Wissen schreiben (nicht mehr machine_data).
  const n = await upsertModelKnowledge({
    userId: user.id,
    machine: {
      id: machine.id,
      modelId: machine.modelId,
      hersteller: machine.hersteller,
      modell: machine.modell,
    },
    result: pruefung.result,
    visibility,
  });
  revalidatePath(`/machines/${machineId}`);

  return { message: `Importiert: ${n} Faktentabelle${n === 1 ? "" : "n"}.` };
}
