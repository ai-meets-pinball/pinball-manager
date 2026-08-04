"use server";

import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { machines } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import { getModelGeneration } from "@/db/queries";
import { upsertTroubleshootingKnowledge } from "@/lib/facts-store";
import { anthropicModelFor, resolveProvider } from "@/lib/ai/provider";
import {
  OLLAMA_TEXT_MODEL,
  ollamaErrorMessage,
  ollamaJson,
} from "@/lib/ai/ollama";
import { MLX_TEXT_MODEL, mlxErrorMessage, mlxText } from "@/lib/ai/mlx";
import {
  buildGuideSystemPrompt,
  GUIDE_OUTPUT_INSTRUCTION,
} from "@/lib/import-guide";
import {
  troubleshootingGuideJsonSchema,
  troubleshootingGuideSchema,
} from "@/lib/validators";

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

/** JSON aus dem Antworttext lösen (falls das Modell etwas umrahmt). */
function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

/** API-/Netzwerkfehler in eine sichere, spezifische Meldung übersetzen. */
function apiErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (e instanceof Anthropic.AuthenticationError) return "Claude-API-Key ist ungültig.";
  if (e instanceof Anthropic.PermissionDeniedError)
    return "Kein Zugriff auf Claude (Rechte oder Guthaben prüfen).";
  if (e instanceof Anthropic.NotFoundError)
    return "Modell nicht verfügbar — ANTHROPIC_MODEL prüfen.";
  if (e instanceof Anthropic.InternalServerError || /overloaded|\b529\b/i.test(msg))
    return "Claude ist gerade überlastet. Bitte in ein paar Minuten erneut versuchen.";
  if (e instanceof Anthropic.RateLimitError || /rate[_ -]?limit|\b429\b/i.test(msg))
    return "Zu viele Anfragen an Claude. Bitte kurz warten und erneut versuchen.";
  if (e instanceof Anthropic.APIConnectionError || /connection|fetch failed|network|ECONN/i.test(msg))
    return "Verbindung zu Claude fehlgeschlagen. Bitte später erneut versuchen.";
  return `Guide konnte nicht erstellt werden: ${msg.slice(0, 200)}`;
}

/*
  Streamt den Guide-Call und liefert die vollständige Antwort. Streaming, weil die
  Ausgabe groß ist (sonst HTTP-Timeout) und der Call mit Websuche minutenlang laufen
  kann. Websuche ist ein Server-Tool: Claude sucht selbst, das Ergebnis erzwingt
  output_config als unser JSON. Erreicht die serverseitige Tool-Schleife ihr Limit
  (stop_reason "pause_turn"), setzen wir den Turn fort (begrenzt).
*/
async function anthropicCall(
  apiKey: string,
  system: string,
  model: string,
  useBasicWebSearch: boolean,
) {
  const client = new Anthropic({ apiKey, maxRetries: 4 });
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: GUIDE_OUTPUT_INSTRUCTION },
  ];

  // Haiku (200k-Kontext) unterstützt nur die einfache Websuche-Variante; die
  // neuere web_search_20260209 gibt es nur auf Opus/Sonnet.
  const webSearch = useBasicWebSearch
    ? { type: "web_search_20250305" as const, name: "web_search" as const, max_uses: 6 }
    : { type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 6 };

  let response: Anthropic.Message | undefined;
  for (let i = 0; i < 4; i++) {
    response = await client.messages
      .stream({
        model,
        max_tokens: 32000,
        system,
        output_config: {
          format: { type: "json_schema", schema: troubleshootingGuideJsonSchema },
        },
        tools: [webSearch],
        messages,
      })
      .finalMessage();

    // pause_turn: Server-Tool-Schleife pausiert — Assistant-Turn anhängen und fortsetzen.
    if (response.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: response.content });
  }
  return response as Anthropic.Message;
}

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
  // Claude (Sonnet ODER Haiku) sucht im Web; die lokalen Pfade (Ollama/MLX) nicht.
  const websuche = provider !== "ollama" && provider !== "mlx";
  const usedModel =
    provider === "ollama"
      ? OLLAMA_TEXT_MODEL
      : provider === "mlx"
        ? MLX_TEXT_MODEL
        : anthropicModelFor(provider);

  let jsonText: string;
  if (provider === "mlx") {
    // Lokaler MLX-Pfad: kein Key, keine Websuche — ein Text-Call.
    try {
      jsonText = await mlxText({
        system,
        prompt: GUIDE_OUTPUT_INSTRUCTION,
        schema: troubleshootingGuideJsonSchema,
      });
    } catch (e) {
      console.error("[troubleshooting] mlx:", (e as Error).message);
      return { error: mlxErrorMessage(e) };
    }
  } else if (provider === "ollama") {
    // Lokaler Pfad: kein API-Key, keine Websuche/Tool-Schleife — ein Call.
    try {
      jsonText = await ollamaJson({
        system,
        prompt: GUIDE_OUTPUT_INSTRUCTION,
        schema: troubleshootingGuideJsonSchema,
      });
    } catch (e) {
      console.error("[troubleshooting] ollama:", (e as Error).message);
      return { error: ollamaErrorMessage(e) };
    }
  } else {
    // Claude-Pfad (Standard). Ephemerer BYO-Schlüssel: nur für diesen Request,
    // nie gespeichert/geloggt; fällt auf den zentralen Env-Key zurück.
    const apiKey =
      String(formData.get("apiKey") ?? "").trim() || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        error: "Kein Claude-API-Schlüssel vorhanden. Bitte deinen eigenen eingeben.",
      };
    }

    let response: Anthropic.Message;
    try {
      response = await anthropicCall(apiKey, system, usedModel, provider === "auto");
    } catch (e) {
      console.error("[troubleshooting] API:", (e as Error).message);
      return { error: apiErrorMessage(e) };
    }

    console.error(
      `[troubleshooting] ${machine.hersteller} ${machine.modell}: in=${response.usage.input_tokens} out=${response.usage.output_tokens} tokens, stop=${response.stop_reason}`,
    );

    if (response.stop_reason === "refusal") {
      return { error: "Die Erstellung wurde abgelehnt." };
    }
    if (response.stop_reason === "max_tokens") {
      return {
        error:
          "Der Guide wurde zu lang und abgeschnitten. Bitte erneut versuchen.",
      };
    }
    if (response.stop_reason === "pause_turn") {
      return { error: "Die Websuche dauerte zu lange. Bitte erneut versuchen." };
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { error: "Es konnte kein Guide erzeugt werden. Bitte erneut versuchen." };
    }
    jsonText = textBlock.text;
  }

  let parsed: ReturnType<typeof troubleshootingGuideSchema.parse>;
  try {
    parsed = troubleshootingGuideSchema.parse(JSON.parse(extractJson(jsonText)));
  } catch (e) {
    console.error("[troubleshooting] parse:", (e as Error).message);
    return { error: "Antwort konnte nicht ausgewertet werden. Bitte erneut versuchen." };
  }

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
