"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { faults, machines } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import {
  getMachineGuides,
  getMachineKnowledge,
  getModelGeneration,
  getModelGuides,
  getModelKnowledge,
  resolvePrompt,
} from "@/db/queries";
import { resolveProvider } from "@/lib/ai/provider";
import { AiError, generateJson } from "@/lib/ai/generate";

/*
  KI-Reparaturvorschlag zu einem gemeldeten Fehler (Roadmap-Phase 3). Nutzt den
  editierbaren Prompt "repair_suggestion" (resolvePrompt, ggf. Hersteller-/
  Generation-Override) und das vorhandene Maschinen-Wissen (Handbuch-Fakten +
  Guides) als Kontext. Der Vorschlag füllt eine NEUE Reparatur vor — der Mensch
  prüft und speichert. Nur mit Schreibrecht, nur auf Knopfdruck.
*/
export type RepairSuggestState = {
  error?: string;
  vorschlag?: {
    diagnose: string;
    massnahme: string;
    teile: string;
    hinweis: string;
  };
};

const repairSuggestionJsonSchema = {
  type: "object",
  properties: {
    diagnose: { type: "string" },
    massnahme: { type: "string" },
    teile: { type: "string" },
    hinweis: { type: "string" },
  },
  required: ["diagnose", "massnahme", "teile", "hinweis"],
  additionalProperties: false,
} as const;

function kappe(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + " …" : s;
}

export async function generateRepairSuggestion(
  _prev: RepairSuggestState,
  formData: FormData,
): Promise<RepairSuggestState> {
  const faultId = String(formData.get("faultId") ?? "");
  const fault = await db.query.faults.findFirst({
    where: eq(faults.id, faultId),
  });
  if (!fault) return { error: "Fehler nicht gefunden." };

  // Schreibrecht auf der zugehörigen Maschine (erbt über die Maschine).
  const { user } = await requireMachineWrite(fault.machineId);
  const machine = await db.query.machines.findFirst({
    where: eq(machines.id, fault.machineId),
  });
  if (!machine) return { error: "Maschine nicht gefunden." };

  // Kontext: Generation (Prompt-Override + Info) + vorhandenes Wissen.
  const gen = machine.modelId
    ? await getModelGeneration(machine.modelId)
    : null;
  const fakten = machine.modelId
    ? await getModelKnowledge(user, machine.modelId)
    : await getMachineKnowledge(user, machine.id);
  const guides = machine.modelId
    ? await getModelGuides(user, machine.modelId)
    : await getMachineGuides(user, machine.id);

  const teile: string[] = [];
  for (const f of fakten) {
    teile.push(
      `Handbuch-Fakten „${f.titel}": ${kappe(JSON.stringify(f.inhalt), 3000)}`,
    );
  }
  for (const g of guides) {
    teile.push(
      `Troubleshooting-Guide „${g.titel}": ${kappe(JSON.stringify(g.inhalt), 6000)}`,
    );
  }
  const wissen = teile.length
    ? kappe(teile.join("\n\n"), 14000)
    : "(kein hinterlegtes Wissen zu diesem Gerät)";

  const provider = resolveProvider(formData);
  const { text: prompt } = await resolvePrompt("repair_suggestion", {
    hersteller: machine.hersteller,
    generationId: gen?.id ?? null,
    vars: {
      hersteller: machine.hersteller,
      modell: machine.modell,
      baujahr: machine.baujahr ? String(machine.baujahr) : "unbekannt",
      symptom: fault.beschreibung,
      kategorie: fault.kategorie ?? "(keine)",
      wissen,
    },
  });

  try {
    const antwort = await generateJson(provider, {
      prompt,
      schema: repairSuggestionJsonSchema,
      maxTokens: 8000,
      apiKey: String(formData.get("apiKey") ?? ""),
      zweck: "Reparatur",
    });
    if (antwort.abgeschnitten) {
      return {
        error: "Die Antwort wurde abgeschnitten — bitte erneut versuchen.",
      };
    }
    const j = (antwort.json ?? {}) as Record<string, unknown>;
    return {
      vorschlag: {
        diagnose: String(j.diagnose ?? ""),
        massnahme: String(j.massnahme ?? ""),
        teile: String(j.teile ?? ""),
        hinweis: String(j.hinweis ?? ""),
      },
    };
  } catch (e) {
    console.error("[repair-suggestion]", (e as Error).message);
    if (e instanceof AiError) return { error: e.userMessage };
    throw e;
  }
}
