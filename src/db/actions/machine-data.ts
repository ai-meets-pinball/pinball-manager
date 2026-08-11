"use server";

import { revalidatePath } from "next/cache";
import { requireMachineAccess } from "@/lib/session";
import { parseFactsText } from "@/lib/import-facts";
import { parseGuideText } from "@/lib/import-guide";
import {
  upsertModelKnowledge,
  upsertTroubleshootingKnowledge,
} from "@/lib/facts-store";
import { getModelGeneration } from "@/db/queries";
import type { FormState } from "@/db/actions/form-state";

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

  const pruefung = parseFactsText(raw);
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

/*
  Import eines extern (z. B. in ChatGPT mit buildGuideImportPrompt) erzeugten
  Troubleshooting-Guides als JSON — dasselbe Prinzip wie importManualFacts,
  nur für typ='troubleshooting'. Validierung in lib/import-guide.ts (dieselbe
  Funktion prüft auch die Client-Vorschau); geschrieben über
  upsertTroubleshootingKnowledge (ein Guide je Autor und Ebene, alter Stand →
  Verlauf). model="import" kennzeichnet die externe Herkunft in der Anzeige.
*/
export async function importTroubleshootingGuide(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId") ?? "");
  const raw = String(formData.get("json") ?? "");

  // Schreibrecht wie bei der Guide-Generierung (Eigentümer/Club-Manager/Super-Admin).
  const { user, machine, darf } = await requireMachineAccess(machineId);
  if (!darf.bearbeiten) {
    return { error: "Kein Schreibzugriff auf diese Maschine." };
  }

  const pruefung = parseGuideText(raw);
  if (!pruefung.ok || !pruefung.guide) {
    return { error: pruefung.errors[0] ?? "Kein importierbarer Guide im JSON gefunden." };
  }

  const rohSicht = String(formData.get("visibility") ?? "");
  const visibility: "privat" | "club" | "oeffentlich" =
    rohSicht === "club" || rohSicht === "oeffentlich" ? rohSicht : "privat";

  // Ebene wie bei der Generierung: standardmäßig das Modell; „generation" nur,
  // wenn die Maschine ein Modell mit bekannter Generation hat.
  const aufGeneration = String(formData.get("ebene") ?? "") === "generation";
  const generation =
    aufGeneration && machine.modelId
      ? await getModelGeneration(machine.modelId)
      : null;

  await upsertTroubleshootingKnowledge({
    userId: user.id,
    machine: {
      id: machine.id,
      modelId: machine.modelId,
      hersteller: machine.hersteller,
      modell: machine.modell,
    },
    guide: pruefung.guide,
    // Websuche unbekannt (extern erstellt) — true, damit keine irreführende
    // „ohne Websuche"-Warnung erscheint; die Anzeige kennzeichnet über model.
    websuche: true,
    model: "import",
    visibility,
    aufGeneration: generation != null,
    generationId: generation?.id ?? null,
    generationName: generation?.name ?? null,
    kommentar: "Guide importiert",
  });

  revalidatePath(`/machines/${machineId}`);
  return { message: "Guide importiert." };
}
