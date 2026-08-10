import { Ollama } from "ollama";
import {
  AiError,
  type AiAdapter,
  type AiFehlerArt,
} from "@/lib/ai/types";

/*
  Lokaler KI-Pfad über Ollama (siehe provider.ts). Einzige Stelle, an der das
  ollama-SDK berührt wird. SERVER-ONLY: niemals aus einer Client-Komponente
  importieren, sonst landen Node-Interna im Browser-Bundle.

  Die drei KI-Features rufen ollamaJson() und bekommen — wie beim Claude-Pfad —
  einen rohen JSON-String zurück, damit sie ihren bestehenden Schwanz
  (extractJson → JSON.parse → zod.parse → DB) unverändert weiterbenutzen.
*/

const BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
// Text-Modell (digitale PDFs, Guide, Wartungs-Import). ≥12B empfohlen — kleinere
// Modelle extrahieren Referenztabellen (Teilenummern, Matrix) nicht zuverlässig.
const TEXT_MODEL = process.env.OLLAMA_MODEL || "gemma3:12b";
// Multimodales Modell für gescannte/Bild-PDFs; fällt auf das Text-Modell zurück.
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || TEXT_MODEL;

export const OLLAMA_URL = BASE_URL;
export const OLLAMA_TEXT_MODEL = TEXT_MODEL;
export const OLLAMA_VISION_MODEL_ID = VISION_MODEL;

type OllamaJsonArgs = {
  system?: string;
  prompt: string;
  /** Dasselbe JSON-Schema wie bei Claudes output_config — erzwingt die Form. */
  schema: object;
  /** base64-PNGs (ohne data:-Präfix) für gescannte Seiten → Vision-Modell. */
  images?: string[];
  /** Modell explizit überschreiben (sonst automatisch Text vs. Vision). */
  model?: string;
};

/*
  Ein Ollama-Chat-Call mit erzwungenem JSON (structured output über `format`).
  temperature 0 = deterministisch; num_ctx großzügig, damit langer Handbuchtext
  bzw. ein langer Guide nicht abgeschnitten wird (sonst „Parse-Fehler", der in
  Wahrheit ein Kontextlimit ist).

  - think: false — „thinking"-Modelle (z. B. qwen, gemma) verschwenden ohne das
    ein Vielfaches der Zeit fürs Nachdenken; für reine Extraktion unnötig. Das
    senkt die Laufzeit drastisch (im Test 206s → 23s je Batch).
  - stream: true — lange Generierungen (viele Seitenbilder) laufen sonst in den
    Default-Timeout von Node-fetch (undici, ~300s) und brechen mit „fetch failed"
    ab. Gestreamt kommen laufend Tokens → kein Timeout; wir setzen sie zusammen.

  Wichtig: `format` erzwingt nur die FORM (valides JSON, richtige Keys) — nicht
  die Korrektheit der Werte. Die zod-Prüfung im Feature bleibt Form-Gate.
*/
export async function ollamaJson({
  system,
  prompt,
  schema,
  images,
  model,
}: OllamaJsonArgs): Promise<string> {
  const client = new Ollama({ host: BASE_URL });
  const hatBilder = Boolean(images && images.length > 0);

  const messages: { role: string; content: string; images?: string[] }[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({
    role: "user",
    content: prompt,
    ...(hatBilder ? { images } : {}),
  });

  const iterator = await client.chat({
    model: model ?? (hatBilder ? VISION_MODEL : TEXT_MODEL),
    messages,
    format: schema,
    think: false,
    stream: true,
    keep_alive: "5m",
    options: { temperature: 0, num_ctx: 32768 },
  });

  let content = "";
  for await (const part of iterator) {
    content += part.message?.content ?? "";
  }
  return content;
}

/*
  Adapter für den Anbieter-Seam (lib/ai/generate.ts). Ollama kennt kein PDF —
  ein PDF-Dokument wird vorher in Text oder Seitenbilder übersetzt
  (prepare-document.ts), hier kommen also nur Bilder an.
*/
export const ollamaAdapter: AiAdapter = async (anfrage) => {
  const dok = anfrage.dokument;
  if (dok?.art === "pdf") {
    throw new AiError(
      "sonstiges",
      "Ollama kann PDFs nicht direkt lesen — das Handbuch muss vorher aufbereitet werden.",
    );
  }
  const model = anfrage.model ?? (dok?.art === "bilder" ? VISION_MODEL : TEXT_MODEL);
  try {
    const text = await ollamaJson({
      system: anfrage.system,
      prompt: anfrage.prompt,
      schema: anfrage.schema,
      images: dok?.art === "bilder" ? dok.bilder : undefined,
      model,
    });
    return { text, model, ende: "fertig" };
  } catch (e) {
    throw new AiError(fehlerArt(e), ollamaErrorMessage(e), e);
  }
};

function fehlerArt(e: unknown): AiFehlerArt {
  const msg = e instanceof Error ? e.message : String(e);
  return /ECONNREFUSED|fetch failed|ENOTFOUND|EAI_AGAIN|network|socket|timeout|abort|ETIMEDOUT/i.test(
    msg,
  )
    ? "nicht-erreichbar"
    : "sonstiges";
}

/** Ollama-Fehler in eine sichere, spezifische deutsche Meldung übersetzen. */
export function ollamaErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/ECONNREFUSED|fetch failed|ENOTFOUND|EAI_AGAIN|Failed to fetch|network|socket/i.test(msg))
    return `Ollama nicht erreichbar unter ${BASE_URL}. Läuft der Dienst? (ollama serve)`;
  if (/not found|try pulling|no such model|\b404\b/i.test(msg))
    return `Ollama-Modell nicht gefunden. Bitte zuerst ziehen: ollama pull ${TEXT_MODEL}`;
  if (/timeout|abort|ETIMEDOUT/i.test(msg))
    return "Das lokale Modell (Ollama) hat zu lange gebraucht. Bitte kleineres PDF/Modell verwenden und erneut versuchen.";
  // Sonst die tatsächliche Ollama-Meldung mitgeben (z. B. Speicher-/Modellfehler),
  // statt einer nichtssagenden Pauschale.
  return `Lokales Modell (Ollama) fehlgeschlagen: ${msg.slice(0, 300)}`;
}
