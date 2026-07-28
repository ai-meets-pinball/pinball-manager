"use server";

import { revalidatePath } from "next/cache";
import { requireMachineAccess } from "@/lib/session";
import { parseImportedFacts } from "@/lib/import-facts";
import { replaceMachineFacts } from "@/lib/facts-store";
import type { FormState } from "@/db/actions/clubs";

/*
  Import bereits extrahierter Handbuch-Fakten als JSON — die Alternative zum
  KI-/PDF-Upload für Nutzer, die die Extraktion selbst (z. B. in ChatGPT)
  gemacht haben. KEIN PDF, KEINE Attestation: es werden nur strukturierte Fakten
  entgegengenommen. Validierung/Normalisierung in lib/import-facts.ts (dieselbe
  Funktion prüft auch die Client-Vorschau); geschrieben über replaceMachineFacts
  (Replace-Semantik wie beim PDF-Pfad).
*/
export async function importManualFacts(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId") ?? "");
  const raw = String(formData.get("json") ?? "");

  // Schreibrecht wie beim PDF-Upload (Eigentümer/Club-Manager/Super-Admin).
  const { darf } = await requireMachineAccess(machineId);
  if (!darf.bearbeiten) {
    return { error: "Kein Schreibzugriff auf diese Maschine." };
  }

  const pruefung = parseImportedFacts(raw);
  if (!pruefung.ok || !pruefung.result) {
    return { error: pruefung.errors[0] ?? "Keine importierbaren Tabellen im JSON gefunden." };
  }

  const counts = await replaceMachineFacts(machineId, pruefung.result);
  revalidatePath(`/machines/${machineId}`);

  const summe = Object.entries(counts)
    .map(([typ, n]) => `${typ} (${n})`)
    .join(", ");
  return { message: `Importiert: ${summe}.` };
}
