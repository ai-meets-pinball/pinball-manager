"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { machines } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import { getModelGeneration } from "@/db/queries";
import { upsertTroubleshootingKnowledge } from "@/lib/facts-store";
import { resolveProvider } from "@/lib/ai/provider";
import { AiError, generateJson, type AiAntwort } from "@/lib/ai/generate";
import {
  buildGuideSystemPrompt,
  GUIDE_OUTPUT_INSTRUCTION,
  parseGuide,
} from "@/lib/import-guide";
import { troubleshootingGuideJsonSchema } from "@/lib/validators";

/*
  Troubleshooting-Guide je Modell.

  Ausgangslage: Wenn Handbuch-Fakten vorliegen (Lampenmatrix o. ä. als
  Modell-Wissen in `knowledge`), bieten wir zusätzlich einen umfassenden FAQ- &
  Troubleshooting-Guide an. Er wird von Claude erzeugt — mit Websuche, damit
  Plattform und bekannte Serienfehler gegen Community-Quellen
  (IPDB/PinWiki/Pinside) verifiziert werden können.

  Anders als beim Handbuch-Upload gibt es hier KEIN Copyright-Thema: Der Guide ist
  von Claude generierter Text, kein Auszug aus dem Handbuch. Er wird als
  Modell-Wissen gespeichert (Datenmodell-Redesign Phase 2: `knowledge`,
  typ='troubleshooting', einmal je Autor und Ebene) — mit wählbarer Sichtbarkeit.
  Autorisierung erbt über die Maschine (kein RLS), erzeugen darf nur, wer
  schreiben darf.

  Ausgabe ist bewusst strukturiertes JSON (Abschnitte aus Text-/Warn-/Tabellen-
  Blöcken), passend zur bestehenden „Service-Console"-Darstellung — kein Markdown.
*/

export type GuideState = { error?: string; ok?: boolean };

/*
  Systemprompt (buildGuideSystemPrompt) und Output-Instruktion liegen im reinen
  Modul lib/import-guide.ts, weil der JSON-Import denselben Prompt zum Kopieren
  anbietet — diese Datei ("use server") darf nur async-Funktionen exportieren.
*/

export async function generateTroubleshootingGuide(
  _prev: GuideState,
  formData: FormData,
): Promise<GuideState> {
  const machineId = String(formData.get("machineId"));
  // Autorisierung: Eigentümer ODER Club-Mitglied (kein RLS). Wirft sonst.
  const { user } = await requireMachineWrite(machineId);

  const machine = await db.query.machines.findFirst({
    where: eq(machines.id, machineId),
  });
  if (!machine) return { error: "Maschine nicht gefunden." };

  // Zwei Wege (siehe lib/ai/provider.ts): Claude (Standard, MIT Websuche) oder
  // lokal via Ollama (OHNE Websuche — Server-Tool ohne lokales Äquivalent). Der
  // Guide-Systemprompt hedged bereits („Falls Websuche verfügbar …") und
  // degradiert damit sauber. `websuche` wird gespeichert und in der Anzeige
  // kenntlich gemacht, damit die geringere Verlässlichkeit sichtbar ist.
  const provider = resolveProvider(formData);
  const system = buildGuideSystemPrompt(machine);

  let antwort: AiAntwort;
  try {
    antwort = await generateJson(provider, {
      system,
      prompt: GUIDE_OUTPUT_INSTRUCTION,
      // „Nutze Websuche, wenn du kannst" — welcher Anbieter das kann, muss der
      // Aufrufer nicht wissen; die Antwort sagt, was tatsächlich passiert ist.
      websuche: true,
      schema: troubleshootingGuideJsonSchema,
      maxTokens: 32000,
      apiKey: String(formData.get("apiKey") ?? ""),
      zweck: "Guide",
    });
  } catch (e) {
    console.error("[troubleshooting]", (e as Error).message);
    if (e instanceof AiError) return { error: e.userMessage };
    throw e;
  }

  // Gespeichert wird, was wirklich lief: ohne Websuche ist der Guide weniger
  // verlässlich, und das wird in der Anzeige kenntlich gemacht.
  const websuche = antwort.websucheGenutzt;
  const usedModel = antwort.model;

  if (antwort.abgeschnitten) {
    return {
      error: "Der Guide wurde zu lang und abgeschnitten. Bitte erneut versuchen.",
    };
  }

  // Dieselbe Kette wie beim eingefügten JSON: Umschlag-Toleranz, Struktur-
  // prüfung und die Vollständigkeits-Hinweise (fehlende Abschnitte, keine
  // Quellen). Vorher bekam die KI-Antwort davon nichts.
  const bericht = parseGuide(antwort.json);
  if (!bericht.ok || !bericht.guide) {
    console.error("[troubleshooting] parse:", bericht.errors.join(" · "));
    return {
      error:
        bericht.errors[0] ??
        "Antwort konnte nicht ausgewertet werden. Bitte erneut versuchen.",
    };
  }
  if (bericht.warnings.length > 0) {
    console.error("[troubleshooting] Hinweise:", bericht.warnings.join(" · "));
  }
  const parsed = bericht.guide;

  // Datenmodell-Redesign (Phase 2): der Guide ist Modell-Wissen (knowledge,
  // typ='troubleshooting') — einmal je Autor und Ebene, mit wählbarer
  // Sichtbarkeit. Ohne Modell fällt er auf die Maschinen-Ebene zurück.
  const rohSicht = String(formData.get("visibility") ?? "");
  const visibility: "privat" | "club" | "oeffentlich" =
    rohSicht === "club" || rohSicht === "oeffentlich" ? rohSicht : "privat";

  // Ebene: standardmäßig das Modell. „generation" nur, wenn die Maschine einen
  // Modell mit bekannter Generation hat — dann gilt der Guide für ALLE
  // Modelle dieser Board-/Hardware-Generation (Generation-Resolver).
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
    guide: parsed,
    websuche,
    model: usedModel,
    visibility,
    aufGeneration: generation != null,
    generationId: generation?.id ?? null,
    generationName: generation?.name ?? null,
  });

  revalidatePath(`/machines/${machineId}`);
  return { ok: true };
}
