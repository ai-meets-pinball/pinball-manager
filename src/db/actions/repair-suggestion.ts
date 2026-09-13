"use server";

import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { faults, kiAufrufe, machines } from "@/db/schema";
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
import { getKiInDerApp } from "@/db/queries/settings";
import { KI_LIMIT, kiLimit } from "@/lib/ki-limit";
import { darfEigenenSchluessel } from "@/lib/ki-zugang";
import { datenBlock, einzeilig } from "@/lib/prompt-sicher";
import { isSuperAdmin } from "@/lib/rechte";
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

  // Der Reparaturvorschlag ist die eine KI-Funktion für ALLE — über den
  // Plattform-Schlüssel (kleiner, planbarer Aufruf). Einen eigenen Schlüssel
  // darf nur der Betreiber mitgeben (lib/ki-zugang); ohne beides gibt es
  // eine klare Meldung statt eines 401 vom Anbieter.
  // Missbrauchsschutz (lib/ki-limit): Aufrufe im Fenster zählen, BEVOR der
  // Plattform-Schlüssel Kosten erzeugt; Super-Admins sind ausgenommen.
  const fensterStart = new Date(Date.now() - KI_LIMIT.fensterMinuten * 60_000);
  const [{ n: aufrufe }] = await db
    .select({ n: count() })
    .from(kiAufrufe)
    .where(and(eq(kiAufrufe.userId, user.id), gte(kiAufrufe.createdAt, fensterStart)));
  const limit = kiLimit(aufrufe, isSuperAdmin(user));
  if (!limit.erlaubt) return { error: limit.grund };

  const provider = resolveProvider(formData);
  const eigenerSchluessel = darfEigenenSchluessel(user, await getKiInDerApp(user.id))
    ? String(formData.get("apiKey") ?? "")
    : "";
  const cloud = provider === "anthropic" || provider === "auto";
  if (cloud && !process.env.ANTHROPIC_API_KEY && !eigenerSchluessel) {
    return {
      error:
        "Kein Plattform-Schlüssel konfiguriert — der KI-Vorschlag steht derzeit nicht zur Verfügung.",
    };
  }
  const { text: prompt } = await resolvePrompt("repair_suggestion", {
    hersteller: machine.hersteller,
    generationId: gen?.id ?? null,
    // Nutzertext sicher einsetzen (lib/prompt-sicher): kurze Felder einzeilig,
    // Symptom und Wissen als gerahmte Datenblöcke — auch wenn sie wie
    // Anweisungen klingen.
    vars: {
      hersteller: einzeilig(machine.hersteller),
      modell: einzeilig(machine.modell),
      baujahr: machine.baujahr ? String(machine.baujahr) : "unbekannt",
      symptom: datenBlock(fault.beschreibung, "SYMPTOM"),
      kategorie: einzeilig(fault.kategorie ?? "(keine)", 40),
      wissen: datenBlock(wissen, "WISSEN"),
    },
  });

  // Der Aufruf zählt, sobald er losgeht — auch ein Fehlschlag kostet Tokens.
  await db.insert(kiAufrufe).values({ userId: user.id, zweck: "reparatur" });

  try {
    const antwort = await generateJson(provider, {
      prompt,
      schema: repairSuggestionJsonSchema,
      maxTokens: 8000,
      apiKey: eigenerSchluessel,
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
