import Anthropic from "@anthropic-ai/sdk";
import { AiError, type AiAnfrage, type AiRohantwort } from "@/lib/ai/types";
import { anthropicModelFor, type AiProvider } from "@/lib/ai/provider";

/*
  Claude-Adapter. Einzige Stelle, an der das Anthropic-SDK berührt wird —
  vorher stand `new Anthropic(` an vier Stellen in drei Dateien.

  SERVER-ONLY: niemals aus einer Client-Komponente importieren.

  Gestreamt wird immer: die Ausgaben sind groß (bis 64k Tokens) und Läufe mit
  Websuche können Minuten dauern; ohne Streaming läuft der HTTP-Request in
  einen Timeout. `finalMessage()` setzt den Stream wieder zusammen.
*/

// Mehr Retries als der Default (2): transiente 429/5xx/Overloaded-Fehler
// sollen sich selbst heilen, bevor ein Nutzer eine Fehlermeldung sieht.
const RETRIES = 4;

// Wie oft eine pausierte Server-Tool-Schleife (Websuche) fortgesetzt wird.
const MAX_FORTSETZUNGEN = 4;

const DEFAULT_MAX_TOKENS = 8000;

/** Anthropic-Fehler in eine sichere, spezifische deutsche Meldung übersetzen.
    Neben den Fehlerklassen auch die Meldung prüfen: Overloaded (529) und
    Rate-Limit kommen aus dem Stream teils NICHT als passende Klasse an. */
function alsAiError(e: unknown, zweck: string): AiError {
  const msg = e instanceof Error ? e.message : String(e);
  if (e instanceof Anthropic.AuthenticationError)
    return new AiError("kein-key", "Claude-API-Key ist ungültig.", e);
  if (e instanceof Anthropic.PermissionDeniedError)
    return new AiError(
      "kein-key",
      "Kein Zugriff auf Claude (Rechte oder Guthaben prüfen).",
      e,
    );
  if (e instanceof Anthropic.NotFoundError)
    return new AiError(
      "sonstiges",
      "Modell nicht verfügbar — ANTHROPIC_MODEL prüfen.",
      e,
    );
  if (e instanceof Anthropic.InternalServerError || /overloaded|\b529\b/i.test(msg))
    return new AiError(
      "nicht-erreichbar",
      "Claude ist gerade überlastet. Bitte in ein paar Minuten erneut versuchen.",
      e,
    );
  if (e instanceof Anthropic.RateLimitError || /rate[_ -]?limit|\b429\b/i.test(msg))
    return new AiError(
      "nicht-erreichbar",
      "Zu viele Anfragen an Claude. Bitte kurz warten und erneut versuchen.",
      e,
    );
  if (
    e instanceof Anthropic.APIConnectionError ||
    /connection|fetch failed|network|ECONN/i.test(msg)
  )
    return new AiError(
      "nicht-erreichbar",
      "Verbindung zu Claude fehlgeschlagen. Bitte später erneut versuchen.",
      e,
    );
  return new AiError("sonstiges", `${zweck} fehlgeschlagen: ${msg.slice(0, 200)}`, e);
}

/** Prompt und optionales Dokument in Claudes Content-Blöcke übersetzen. */
function inhalt(anfrage: AiAnfrage): Anthropic.ContentBlockParam[] {
  const bloecke: Anthropic.ContentBlockParam[] = [];
  const dok = anfrage.dokument;
  if (dok?.art === "pdf") {
    bloecke.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: dok.base64 },
    });
  } else if (dok?.art === "bilder") {
    for (const data of dok.bilder) {
      bloecke.push({
        type: "image",
        source: { type: "base64", media_type: "image/png", data },
      });
    }
  }
  bloecke.push({ type: "text", text: anfrage.prompt });
  return bloecke;
}

export async function anthropicAdapter(
  provider: AiProvider,
  anfrage: AiAnfrage,
): Promise<AiRohantwort> {
  // Ephemerer BYO-Schlüssel: nur für diesen Request, nie gespeichert/geloggt;
  // fällt auf den zentralen Env-Key zurück.
  const apiKey = anfrage.apiKey?.trim() || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiError(
      "kein-key",
      "Kein Claude-API-Schlüssel vorhanden. Bitte deinen eigenen eingeben.",
    );
  }

  const model = anfrage.model ?? anthropicModelFor(provider);
  const client = new Anthropic({ apiKey, maxRetries: RETRIES });

  // Websuche ist ein Server-Tool: Claude sucht selbst, output_config erzwingt
  // trotzdem unser JSON. Haiku (200k-Kontext) kann nur die einfache Variante.
  const tools: Anthropic.ToolUnion[] = anfrage.websuche
    ? [
        provider === "auto"
          ? { type: "web_search_20250305", name: "web_search", max_uses: 6 }
          : { type: "web_search_20260209", name: "web_search", max_uses: 6 },
      ]
    : [];

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: inhalt(anfrage) },
  ];

  let response: Anthropic.Message | undefined;
  try {
    for (let i = 0; i < MAX_FORTSETZUNGEN; i++) {
      response = await client.messages
        .stream({
          model,
          max_tokens: anfrage.maxTokens ?? DEFAULT_MAX_TOKENS,
          ...(anfrage.system ? { system: anfrage.system } : {}),
          output_config: {
            format: { type: "json_schema", schema: anfrage.schema },
          },
          ...(tools.length > 0 ? { tools } : {}),
          messages,
        })
        .finalMessage();

      // pause_turn: die Server-Tool-Schleife pausiert — Assistant-Turn
      // anhängen und fortsetzen.
      if (response.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: response.content });
    }
  } catch (e) {
    throw alsAiError(e, anfrage.zweck ?? "Anfrage");
  }

  if (!response) {
    throw new AiError("sonstiges", "Claude lieferte keine Antwort.");
  }

  console.error(
    `[ai:anthropic] ${model}: in=${response.usage.input_tokens} out=${response.usage.output_tokens} tokens, stop=${response.stop_reason}`,
  );

  if (response.stop_reason === "refusal") {
    return { text: "", model, ende: "abgelehnt" };
  }
  if (response.stop_reason === "max_tokens") {
    return { text: "", model, ende: "abgeschnitten" };
  }
  if (response.stop_reason === "pause_turn") {
    return { text: "", model, ende: "pausiert" };
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new AiError(
      "ungueltige-antwort",
      "Claude lieferte keinen auswertbaren Text. Bitte erneut versuchen.",
    );
  }

  return {
    text: textBlock.text,
    model,
    ende: "fertig",
    websucheGenutzt: Boolean(anfrage.websuche),
  };
}
