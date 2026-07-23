import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { machineData } from "@/db/schema";
import { extractSchema, FACT_TYPES } from "@/lib/validators";
import {
  anthropicModelFor,
  claudePdfMaxPages,
  SONNET_MODEL,
  type AiProvider,
} from "@/lib/ai/provider";
import { ollamaErrorMessage, ollamaJson } from "@/lib/ai/ollama";
import {
  pdfPageCount,
  preparePdfForLocalModel,
  renderPdfPagesToPng,
  type LocalPdfInput,
} from "@/lib/ai/prepare-pdf";
import { splitPdfForClaude } from "@/lib/ai/split-pdf";

/*
  Phase-2-Pipeline: Handbuch (PDF) → Faktentabellen.

  Kein "use server": die eigentliche Arbeit läuft als async Generator, der
  Fortschritts-Events liefert. Aufgerufen wird er von der streamenden API-Route
  (src/app/api/machines/[id]/extract-manual/route.ts), damit der Client bei großen
  gescannten Handbüchern live sieht, wo die Verarbeitung steht.

  Copyright-Leitplanken (PRD §6):
  - Upload nur mit Eigentums-/Rechtebestätigung (Attestation).
  - Das PDF wird NIE gespeichert: die Bytes leben nur im Request-Speicher und
    werden danach verworfen (kein Storage, nichts zu löschen).
  - Nur die extrahierten Faktentabellen landen in machine_data.
*/

/** Fortschritts-Events des Extraktions-Generators (an den Client gestreamt). */
export type ExtractProgress =
  | { type: "start"; mode: "text" | "vision"; totalPages: number; totalBatches: number }
  | { type: "batch"; batch: number; totalBatches: number; fromPage: number; toPage: number }
  | { type: "info"; message: string }
  | { type: "done"; counts: Record<string, number> }
  | { type: "error"; error: string };

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB (In-Memory-Grenze, vgl. next.config.ts)
// Vision-Batching: gescannte Seiten häppchenweise ans lokale Modell geben (kleine
// Modelle verarbeiten wenige Bilder je Aufruf zuverlässiger und schneller).
const VISION_BATCH = Number(process.env.LOCAL_VISION_BATCH_SIZE) || 6;

/* JSON-Schema für Structured Output — spiegelt extractSchema (validators.ts). */
const factTableJsonSchema = {
  type: "object",
  properties: {
    columns: { type: "array", items: { type: "string" } },
    rows: { type: "array", items: { type: "array", items: { type: "string" } } },
  },
  required: ["columns", "rows"],
  additionalProperties: false,
} as const;

const outputJsonSchema = {
  type: "object",
  properties: Object.fromEntries(
    FACT_TYPES.map((t) => [t, factTableJsonSchema]),
  ),
  required: [...FACT_TYPES],
  additionalProperties: false,
};

const EXTRACT_PROMPT = `Du erhältst das Handbuch eines Flipperautomaten als PDF.
Extrahiere AUSSCHLIESSLICH die technischen Referenztabellen, sofern im Handbuch vorhanden.
Verwende je Tabelle GENAU diese Spaltenüberschriften (in dieser Reihenfolge), auch wenn das Handbuch
sie anders benennt — ordne die Werte entsprechend zu; fehlt ein Wert, gib eine leere Zelle "":

- coils    → ["Sol/No", "Funktion", "Typ", "Drive Q", "Wire", "Board"]
- switches → ["Sw/No", "Column", "Row", "Typ", "Funktion"]
             (Switch-Matrix: Column/Row = Rasterposition; bei nicht-Matrix-Schaltern Column/Row = "".
              Typ = "opto" wenn es ein Opto-Schalter ist, sonst "mechanisch")
- lamps    → ["Lamp/No", "Column", "Row", "Funktion"]
             (Lampenmatrix 8×8: Lamp/No = Column×10 + Row; also Column/Row aus der Nummer ableiten)
- fuses    → ["Board", "Fuse", "Rating", "Schützt"]
- parts    → ["Part No", "Beschreibung"]
- rules    → ["Adj/No", "Beschreibung", "Bereich/Standard"]

Regeln: NUR reine Fakten aus diesen Tabellen — KEINEN Fließtext, KEINE Spielregeln-Erklärungen,
KEINE ganzen Seiten, KEINE Beschreibungen. Fehlt eine Tabelle im Handbuch, gib für sie leere
"columns" und "rows" zurück. Halte dich kompakt, keine Duplikate, keine Wiederholungen.`;

/** JSON aus dem Antworttext lösen (falls das Modell etwas umrahmt). */
function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

/** API-/Netzwerkfehler in eine sichere, spezifische Meldung übersetzen. Neben den
    Fehlerklassen auch die Meldung prüfen: Overloaded (529) und Rate-Limit kommen aus
    dem Stream teils NICHT als passende Klasse an, sondern als roher Error. */
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
  return `Extraktion fehlgeschlagen: ${msg.slice(0, 200)}`;
}

/** Streamt den Extraktions-Call und liefert die vollständige Antwort. */
async function anthropicCall(apiKey: string, base64: string, model: string) {
  // Mehr Retries als Default (2): transiente 429/5xx/Overloaded-Fehler von Claude
  // sollen sich möglichst selbst heilen, bevor der Nutzer eine Fehlermeldung sieht.
  const client = new Anthropic({ apiKey, maxRetries: 4 });
  return client.messages
    .stream({
      model,
      max_tokens: 64000,
      output_config: { format: { type: "json_schema", schema: outputJsonSchema } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            },
            { type: "text", text: EXTRACT_PROMPT },
          ],
        },
      ],
    })
    .finalMessage();
}

/** Wie anthropicCall, aber mit vor-gerenderten SEITENBILDERN (hohe Detailstufe)
    statt dem PDF-Block — schärfere Vorlage für schwer lesbare Scans. */
async function anthropicCallImages(apiKey: string, images: string[], model: string) {
  const client = new Anthropic({ apiKey, maxRetries: 4 });
  const content: Anthropic.ContentBlockParam[] = images.map((data) => ({
    type: "image",
    source: { type: "base64", media_type: "image/png", data },
  }));
  content.push({ type: "text", text: EXTRACT_PROMPT });
  return client.messages
    .stream({
      model,
      max_tokens: 64000,
      output_config: { format: { type: "json_schema", schema: outputJsonSchema } },
      messages: [{ role: "user", content }],
    })
    .finalMessage();
}

type ExtractResult = ReturnType<typeof extractSchema.parse>;

function emptyResult(): ExtractResult {
  const leer = () => ({ columns: [] as string[], rows: [] as string[][] });
  return {
    coils: leer(),
    switches: leer(),
    lamps: leer(),
    fuses: leer(),
    parts: leer(),
    rules: leer(),
  };
}

/** Faktentabellen mehrerer Vision-Batches zusammenführen: Zeilen anhängen,
    Duplikate (identische Zeilen, z. B. wiederholte Kopfzeilen) entfernen. */
function mergeFactResults(parts: ExtractResult[]): ExtractResult {
  const merged = emptyResult();
  for (const t of FACT_TYPES) {
    const gesehen = new Set<string>();
    for (const part of parts) {
      const tab = part[t];
      if (tab.columns.length > 0 && merged[t].columns.length === 0) {
        merged[t].columns = tab.columns;
      }
      for (const row of tab.rows) {
        const key = JSON.stringify(row);
        if (!gesehen.has(key)) {
          gesehen.add(key);
          merged[t].rows.push(row);
        }
      }
    }
  }
  return merged;
}

/*
  Ein Claude-Durchgang über alle PDF-Pakete mit EINEM Modell. Liefert unterwegs
  batch/info-Events und gibt die Teil-Ergebnisse zurück — oder "abort", wenn ein
  harter Fehler auftrat (das Fehler-Event wurde dann schon gestreamt). Wird für
  den 1. Durchgang (ggf. Haiku) und den Sonnet-Fallback wiederverwendet.
*/
async function* extractPdfChunksWithClaude(
  key: string,
  fileName: string,
  model: string,
  split: Awaited<ReturnType<typeof splitPdfForClaude>>,
): AsyncGenerator<ExtractProgress, ExtractResult[] | "abort"> {
  const totalBatches = split.chunks.length;
  const teile: ExtractResult[] = [];

  for (let i = 0; i < split.chunks.length; i++) {
    const chunk = split.chunks[i];
    if (totalBatches > 1) {
      yield {
        type: "batch",
        batch: i + 1,
        totalBatches,
        fromPage: chunk.fromPage,
        toPage: chunk.toPage,
      };
    } else {
      yield { type: "info", message: `Claude (${model}) verarbeitet das Handbuch …` };
    }

    let response: Awaited<ReturnType<typeof anthropicCall>>;
    try {
      response = await anthropicCall(key, chunk.base64, model);
    } catch (e) {
      console.error("[manual-extract] API:", (e as Error).message);
      yield { type: "error", error: apiErrorMessage(e) };
      return "abort";
    }

    console.error(
      `[manual-extract] ${fileName} Seiten ${chunk.fromPage}-${chunk.toPage} (${model}): in=${response.usage.input_tokens} out=${response.usage.output_tokens} tokens, stop=${response.stop_reason}`,
    );

    // Ablehnung ist hart → abbrechen. Abschneiden (max_tokens) oder Parse-Fehler
    // betrifft nur DIESES Paket → überspringen, damit der Rest nicht verloren geht.
    if (response.stop_reason === "refusal") {
      yield { type: "error", error: "Die Verarbeitung wurde abgelehnt." };
      return "abort";
    }
    if (response.stop_reason === "max_tokens") {
      console.error(`[manual-extract] Paket ${chunk.fromPage}-${chunk.toPage} abgeschnitten (max_tokens)`);
      continue;
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") continue;
    try {
      teile.push(extractSchema.parse(JSON.parse(extractJson(textBlock.text))));
    } catch (e) {
      console.error(`[manual-extract] Paket ${chunk.fromPage}-${chunk.toPage} parse:`, (e as Error).message);
    }
  }
  return teile;
}

// Hohe Detailstufe: wenige Seiten je Request (die hochauflösenden Bilder sind
// groß), lange Kante ~2200 px (Sonnet nutzt bis 2576 px).
const HIRES_BATCH = 10;
const HIRES_LONG_EDGE = 2200;

/*
  Wie extractPdfChunksWithClaude, aber die Seiten werden SELBST hochauflösend zu
  Bildern gerendert und als image-Blöcke geschickt (statt PDF-Block) — für schwer
  lesbare Scans, bei denen Claudes interne PDF-Darstellung zu grob ist.
*/
async function* extractImagePagesWithClaude(
  key: string,
  fileName: string,
  model: string,
  buffer: Buffer,
  total: number,
): AsyncGenerator<ExtractProgress, ExtractResult[] | "abort"> {
  const totalBatches = Math.ceil(total / HIRES_BATCH);
  const teile: ExtractResult[] = [];
  let batchNo = 0;

  for (let from = 1; from <= total; from += HIRES_BATCH) {
    batchNo++;
    const bis = Math.min(from + HIRES_BATCH - 1, total);
    yield { type: "batch", batch: batchNo, totalBatches, fromPage: from, toPage: bis };

    let images: string[];
    try {
      images = await renderPdfPagesToPng(buffer, from, HIRES_BATCH, HIRES_LONG_EDGE);
    } catch (e) {
      console.error("[manual-extract] render:", (e as Error).message);
      yield { type: "error", error: "Die Seiten konnten nicht gerendert werden." };
      return "abort";
    }

    let response: Awaited<ReturnType<typeof anthropicCallImages>>;
    try {
      response = await anthropicCallImages(key, images, model);
    } catch (e) {
      console.error("[manual-extract] API:", (e as Error).message);
      yield { type: "error", error: apiErrorMessage(e) };
      return "abort";
    }

    console.error(
      `[manual-extract] ${fileName} Seiten ${from}-${bis} (HiRes ${model}): in=${response.usage.input_tokens} out=${response.usage.output_tokens} tokens, stop=${response.stop_reason}`,
    );

    if (response.stop_reason === "refusal") {
      yield { type: "error", error: "Die Verarbeitung wurde abgelehnt." };
      return "abort";
    }
    if (response.stop_reason === "max_tokens") {
      console.error(`[manual-extract] HiRes-Batch ${from}-${bis} abgeschnitten (max_tokens)`);
      continue;
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") continue;
    try {
      teile.push(extractSchema.parse(JSON.parse(extractJson(textBlock.text))));
    } catch (e) {
      console.error(`[manual-extract] HiRes-Batch ${from}-${bis} parse:`, (e as Error).message);
    }
  }
  return teile;
}

/*
  Der eigentliche Extraktions-Lauf als Generator. Validiert Attestation/Datei,
  wählt den Anbieter-Pfad, liefert unterwegs Fortschritts-Events und schreibt die
  Fakten am Ende in machine_data. Autorisierung passiert VOR dem Aufruf in der
  Route (requireMachineWrite).
*/
export async function* extractManualFactsStream(opts: {
  machineId: string;
  file: File;
  attest: boolean;
  provider: AiProvider;
  apiKey?: string;
  /** Hohe Detailstufe: Seiten hochauflösend als Bilder an Sonnet (nur Claude-Pfad). */
  highDetail?: boolean;
}): AsyncGenerator<ExtractProgress> {
  const { machineId, file, attest, provider, apiKey, highDetail } = opts;

  if (!attest) {
    yield {
      type: "error",
      error:
        "Bitte bestätige, dass du das Handbuch besitzt bzw. die Rechte hast, es zu verarbeiten.",
    };
    return;
  }
  if (!(file instanceof File) || file.size === 0) {
    yield { type: "error", error: "Bitte ein Handbuch als PDF auswählen." };
    return;
  }
  if (file.type !== "application/pdf") {
    yield { type: "error", error: "Nur PDF-Dateien werden unterstützt." };
    return;
  }
  if (file.size > MAX_BYTES) {
    yield { type: "error", error: "Datei zu groß (maximal 50 MB)." };
    return;
  }

  let parsed: ExtractResult;

  if (provider === "ollama") {
    // Lokaler Pfad: kein API-Key nötig. PDF → Text oder Seitenbilder (in-memory).
    let prepared: LocalPdfInput;
    try {
      yield { type: "info", message: "PDF wird vorbereitet …" };
      prepared = await preparePdfForLocalModel(Buffer.from(await file.arrayBuffer()));
    } catch (e) {
      console.error("[manual-extract] pdf:", (e as Error).message);
      yield {
        type: "error",
        error: (e as Error).message || "Das PDF konnte nicht vorbereitet werden.",
      };
      return;
    }

    try {
      if (prepared.mode === "text") {
        yield { type: "start", mode: "text", totalPages: 0, totalBatches: 1 };
        yield { type: "info", message: "Fakten werden aus dem Handbuchtext extrahiert …" };
        const jsonText = await ollamaJson({
          prompt: `${EXTRACT_PROMPT}\n\nHandbuchtext:\n${prepared.text}`,
          schema: outputJsonSchema,
        });
        parsed = extractSchema.parse(JSON.parse(extractJson(jsonText)));
      } else {
        // Gescannt: seitenweise in Batches ans Vision-Modell, dann zusammenführen.
        const totalBatches = Math.ceil(prepared.totalPages / VISION_BATCH);
        yield {
          type: "start",
          mode: "vision",
          totalPages: prepared.totalPages,
          totalBatches,
        };

        const teile: ExtractResult[] = [];
        let batch = 0;
        for (let from = 1; from <= prepared.totalPages; from += VISION_BATCH) {
          batch++;
          const bis = Math.min(from + VISION_BATCH - 1, prepared.totalPages);
          yield { type: "batch", batch, totalBatches, fromPage: from, toPage: bis };

          const images = await prepared.renderRange(from, VISION_BATCH);
          const jsonText = await ollamaJson({
            prompt: `${EXTRACT_PROMPT}\n\nDie folgenden Bilder sind die Seiten ${from}–${bis} eines gescannten Handbuchs.`,
            schema: outputJsonSchema,
            images,
          });
          try {
            teile.push(extractSchema.parse(JSON.parse(extractJson(jsonText))));
          } catch (e) {
            // Eine unbrauchbare Batch-Antwort überspringen, nicht alles verlieren.
            console.error(`[manual-extract] ollama batch ${from}-${bis}:`, (e as Error).message);
          }
        }
        console.error(
          `[manual-extract] ollama vision: ${prepared.totalPages} Seiten, ${teile.length}/${totalBatches} Batches verwertbar`,
        );
        parsed = mergeFactResults(teile);
      }
    } catch (e) {
      console.error("[manual-extract] ollama:", (e as Error).message);
      yield { type: "error", error: ollamaErrorMessage(e) };
      return;
    }
  } else {
    // Claude-Pfad (Standard). Ephemerer BYO-Schlüssel: nur für diesen Request,
    // nie gespeichert/geloggt; fällt auf den zentralen Env-Key zurück.
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      yield {
        type: "error",
        error: "Kein Claude-API-Schlüssel vorhanden. Bitte deinen eigenen eingeben.",
      };
      return;
    }

    if (highDetail) {
      // Hohe Detailstufe: Seiten selbst hochauflösend rendern und als Bilder an
      // Sonnet (High-Res-Vision) — für schwer lesbare Scans, wo der PDF-Block zu
      // grob ist. Immer Sonnet, unabhängig von der Anbieter-Wahl.
      const buf = Buffer.from(await file.arrayBuffer());
      let total: number;
      try {
        total = await pdfPageCount(buf);
      } catch (e) {
        console.error("[manual-extract] pagecount:", (e as Error).message);
        yield {
          type: "error",
          error: "Das PDF konnte nicht gelesen werden. Ist es ein gültiges PDF?",
        };
        return;
      }
      yield {
        type: "start",
        mode: "vision",
        totalPages: total,
        totalBatches: Math.ceil(total / HIRES_BATCH),
      };
      const r = yield* extractImagePagesWithClaude(key, file.name, SONNET_MODEL(), buf, total);
      if (r === "abort") return;
      parsed = mergeFactResults(r);
    } else {
      // Claude liest das PDF nativ, aber je Request begrenzt (Seiten + 32 MB).
      // Große Handbücher in Pakete teilen und die Fakten zusammenführen.
      let split: Awaited<ReturnType<typeof splitPdfForClaude>>;
      try {
        split = await splitPdfForClaude(
          Buffer.from(await file.arrayBuffer()),
          claudePdfMaxPages(provider),
        );
      } catch (e) {
        console.error("[manual-extract] split:", (e as Error).message);
        yield {
          type: "error",
          error: "Das PDF konnte nicht gelesen/aufgeteilt werden. Ist es ein gültiges PDF?",
        };
        return;
      }

      yield {
        type: "start",
        mode: "text",
        totalPages: split.totalPages,
        totalBatches: split.chunks.length,
      };

      // 1. Durchgang mit dem gewählten Modell (bei "auto": das günstige Haiku).
      const first = yield* extractPdfChunksWithClaude(
        key,
        file.name,
        anthropicModelFor(provider),
        split,
      );
      if (first === "abort") return;
      let merged = mergeFactResults(first);

      // Auto-Eskalation: fand das günstige Modell KEINE einzige Tabelle, mit dem
      // stärkeren Sonnet nachlegen (nur bei Provider "auto"). Kostet nur dann extra,
      // wenn Haiku ohnehin nichts geliefert hätte.
      if (provider === "auto" && FACT_TYPES.every((t) => merged[t].rows.length === 0)) {
        const strong = SONNET_MODEL();
        yield {
          type: "info",
          message: `Günstiges Modell fand keine Tabellen — schalte auf ${strong} …`,
        };
        const second = yield* extractPdfChunksWithClaude(key, file.name, strong, split);
        if (second === "abort") return;
        merged = mergeFactResults(second);
      }

      parsed = merged;
    }
  }

  // Nur schreiben, wenn tatsächlich Tabellen gefunden wurden. Ein leerer Lauf soll
  // vorhandene Fakten NICHT löschen (Replace-Semantik nur bei echtem Ergebnis).
  const present = FACT_TYPES.filter((t) => parsed[t].rows.length > 0);
  if (present.length === 0) {
    yield { type: "done", counts: {} };
    return;
  }

  yield { type: "info", message: "Fakten werden gespeichert …" };
  const counts: Record<string, number> = {};
  await db.transaction(async (tx) => {
    await tx.delete(machineData).where(eq(machineData.machineId, machineId));
    for (const typ of present) {
      await tx.insert(machineData).values({ machineId, typ, daten: parsed[typ] });
      counts[typ] = parsed[typ].rows.length;
    }
  });

  yield { type: "done", counts };
}
