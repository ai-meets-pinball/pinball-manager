import { extractSchema, FACT_TYPES } from "@/lib/validators";
import { upsertModelKnowledge } from "@/lib/facts-store";
import { extractSpaltenBlock } from "@/lib/prompts";
import { resolvePrompt } from "@/db/queries";
import { parseFacts } from "@/lib/import-facts";
import { SONNET_MODEL, type AiProvider } from "@/lib/ai/provider";
import { AiError, generateJson } from "@/lib/ai/generate";
import {
  prepareDocument,
  type Aufbereitung,
  type Paket,
} from "@/lib/ai/prepare-document";

/*
  Phase-2-Pipeline: Handbuch (PDF) → Faktentabellen.

  Kein "use server": die eigentliche Arbeit läuft als async Generator, der
  Fortschritts-Events liefert. Aufgerufen wird er von der streamenden API-Route
  (src/app/api/machines/[id]/extract-manual/route.ts), damit der Client bei großen
  gescannten Handbüchern live sieht, wo die Verarbeitung steht.

  Der Anbieter kommt hier nur noch als Wert vor, nicht als Verzweigung:
  prepare-document.ts übersetzt das PDF in Pakete, generate.ts spricht mit dem
  Modell. Was hier bleibt, ist Extraktionswissen — Fortschritt melden, Pakete
  zusammenführen, und bei „auto" mit dem stärkeren Modell nachlegen, wenn das
  günstige nichts fand.

  Copyright-Leitplanken (PRD §6):
  - Upload nur mit Eigentums-/Rechtebestätigung (Attestation).
  - Das PDF wird NIE gespeichert: die Bytes leben nur im Request-Speicher und
    werden danach verworfen (kein Storage, nichts zu löschen).
  - Nur die extrahierten Faktentabellen landen als Modell-Wissen in der DB.
*/

/** Fortschritts-Events des Extraktions-Generators (an den Client gestreamt). */
export type ExtractProgress =
  | {
      type: "start";
      mode: "text" | "vision";
      totalPages: number;
      totalBatches: number;
    }
  | {
      type: "batch";
      batch: number;
      totalBatches: number;
      fromPage: number;
      toPage: number;
    }
  | { type: "info"; message: string }
  | { type: "done"; counts: Record<string, number> }
  | { type: "error"; error: string };

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB (In-Memory-Grenze, vgl. next.config.ts)

/* JSON-Schema für Structured Output — spiegelt extractSchema (validators.ts). */
const factTableJsonSchema = {
  type: "object",
  properties: {
    columns: { type: "array", items: { type: "string" } },
    rows: {
      type: "array",
      items: { type: "array", items: { type: "string" } },
    },
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

/* Der Extraktions-Prompt lebt jetzt in der Registry (lib/prompts.ts, key
   "extract") und wird per resolvePrompt aufgelöst (global oder pro Hersteller).
   Der strukturelle Spaltenblock kommt aus extractSpaltenBlock() als {{spalten}}. */

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

/** Faktentabellen mehrerer Pakete zusammenführen: Zeilen anhängen, Duplikate
    (identische Zeilen, z. B. wiederholte Kopfzeilen) entfernen. */
export function mergeFactResults(parts: ExtractResult[]): ExtractResult {
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

/** Hat ein Ergebnis überhaupt eine Zeile? */
export function istLeer(r: ExtractResult): boolean {
  return FACT_TYPES.every((t) => r[t].rows.length === 0);
}

/** Prompt für ein Paket: der feste Extraktionsauftrag plus, falls das Paket
    Text statt eines Dokuments liefert, der Handbuchtext selbst. */
function paketPrompt(basis: string, text: string | undefined): string {
  return text ? `${basis}\n\nHandbuchtext:\n${text}` : basis;
}

/*
  Ein Durchgang über alle Pakete mit EINEM Modell. Liefert unterwegs
  batch/info-Events und gibt die Teil-Ergebnisse zurück — oder "abort", wenn
  ein harter Fehler auftrat (das Fehler-Event wurde dann schon gestreamt).
  Wird für den 1. Durchgang und den Sonnet-Fallback wiederverwendet.
*/
async function* durchgang(
  provider: AiProvider,
  aufbereitung: Aufbereitung,
  opts: { apiKey?: string; model?: string; prompt: string },
): AsyncGenerator<ExtractProgress, ExtractResult[] | "abort"> {
  const teile: ExtractResult[] = [];
  const gesamt = aufbereitung.pakete.length;
  // Dieselbe Warnung („Spaltenüberschriften fehlten") kommt sonst je Paket
  // einmal — einmal sagen reicht.
  const gemeldet = new Set<string>();

  for (const paket of aufbereitung.pakete) {
    yield* meldePaket(paket, gesamt, opts.model);

    let inhalt;
    try {
      inhalt = await paket.laden();
    } catch (e) {
      yield {
        type: "error",
        error: fehlertext(e, "Das PDF konnte nicht aufbereitet werden."),
      };
      return "abort";
    }

    try {
      const antwort = await generateJson(provider, {
        prompt: paketPrompt(opts.prompt, inhalt.text),
        schema: outputJsonSchema,
        dokument: inhalt.dokument,
        maxTokens: 64000,
        apiKey: opts.apiKey,
        model: opts.model,
        zweck: "Extraktion",
      });
      // Abgeschnitten betrifft nur DIESES Paket — überspringen, damit der Rest
      // nicht verloren geht.
      if (antwort.abgeschnitten) {
        console.error(
          `[manual-extract] Paket ${paket.vonSeite}-${paket.bisSeite} abgeschnitten`,
        );
        continue;
      }
      // Dieselbe Kette wie beim eingefügten JSON: normalisieren, Zeilen
      // auffüllen, Spalten prüfen — und die Hinweise sichtbar machen.
      const bericht = parseFacts(antwort.json);
      yield* meldeHinweise(bericht.warnings, gemeldet);
      if (bericht.result) {
        teile.push(bericht.result);
      } else if (bericht.errors.length > 0) {
        console.error(
          `[manual-extract] Paket ${paket.vonSeite}-${paket.bisSeite}:`,
          bericht.errors.join(" · "),
        );
      }
    } catch (e) {
      // Eine unbrauchbare Antwort kostet nur dieses Paket. Ein Verbindungs-
      // oder Rechteproblem betrifft den ganzen Lauf → abbrechen.
      if (e instanceof AiError && e.art === "ungueltige-antwort") {
        console.error(
          `[manual-extract] Paket ${paket.vonSeite}-${paket.bisSeite}:`,
          e.message,
        );
        continue;
      }
      if (!(e instanceof AiError)) {
        // zod-Fehler: die Form stimmt nicht — auch nur dieses Paket.
        console.error(
          `[manual-extract] Paket ${paket.vonSeite}-${paket.bisSeite} parse:`,
          (e as Error).message,
        );
        continue;
      }
      yield { type: "error", error: e.userMessage };
      return "abort";
    }
  }
  return teile;
}

/** Fortschritt für ein Paket melden: Batch-Zähler, bei nur einem Paket eine
    schlichte Statuszeile. */
function* meldePaket(
  paket: Paket,
  gesamt: number,
  model: string | undefined,
): Generator<ExtractProgress> {
  if (gesamt > 1) {
    yield {
      type: "batch",
      batch: paket.nummer,
      totalBatches: gesamt,
      fromPage: paket.vonSeite,
      toPage: paket.bisSeite,
    };
  } else {
    yield {
      type: "info",
      message: model
        ? `${model} verarbeitet das Handbuch …`
        : "Das Handbuch wird verarbeitet …",
    };
  }
}

/** Hinweise aus der Normalisierung an den Client geben — jeden nur einmal. */
function* meldeHinweise(
  hinweise: string[],
  gemeldet: Set<string>,
): Generator<ExtractProgress> {
  for (const h of hinweise) {
    if (gemeldet.has(h)) continue;
    gemeldet.add(h);
    yield { type: "info", message: h };
  }
}

function fehlertext(e: unknown, fallback: string): string {
  if (e instanceof AiError) return e.userMessage;
  return (e as Error)?.message || fallback;
}

/*
  Der eigentliche Extraktions-Lauf als Generator. Validiert Attestation/Datei,
  lässt das PDF für den Anbieter aufbereiten, liefert unterwegs Fortschritts-
  Events und schreibt die Fakten am Ende als Modell-Wissen. Autorisierung
  passiert VOR dem Aufruf in der Route (requireMachineWrite).
*/
export async function* extractManualFactsStream(opts: {
  userId: string;
  machine: {
    id: string;
    modelId: string | null;
    hersteller: string;
    modell: string;
  };
  visibility: "privat" | "club" | "oeffentlich";
  file: File;
  attest: boolean;
  provider: AiProvider;
  apiKey?: string;
  /** Hohe Detailstufe: Seiten hochauflösend als Bilder an Sonnet (nur Claude). */
  highDetail?: boolean;
}): AsyncGenerator<ExtractProgress> {
  const {
    userId,
    machine,
    visibility,
    file,
    attest,
    provider,
    apiKey,
    highDetail,
  } = opts;

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

  yield { type: "info", message: "PDF wird vorbereitet …" };
  let aufbereitung: Aufbereitung;
  try {
    aufbereitung = await prepareDocument({
      provider,
      buffer: Buffer.from(await file.arrayBuffer()),
      highDetail,
    });
  } catch (e) {
    console.error("[manual-extract] prepare:", (e as Error).message);
    yield {
      type: "error",
      error: fehlertext(e, "Das PDF konnte nicht vorbereitet werden."),
    };
    return;
  }

  yield {
    type: "start",
    mode: aufbereitung.modus,
    totalPages: aufbereitung.seiten,
    totalBatches: aufbereitung.pakete.length,
  };

  // Extraktions-Prompt einmal auflösen (Registry/Override, ggf. pro Hersteller);
  // der {{spalten}}-Block ist strukturell fix. Bei DB-Problemen → Code-Standard.
  const { text: extractPrompt } = await resolvePrompt("extract", {
    hersteller: machine.hersteller,
    vars: { spalten: extractSpaltenBlock() },
  });

  // Hohe Detailstufe geht immer an Sonnet, unabhängig von der Anbieter-Wahl.
  const erstesModell = highDetail ? SONNET_MODEL() : undefined;

  let parsed: ExtractResult;

  if (aufbereitung.zuTextVereinen) {
    // MLX-Scan: die Pakete liefern OCR-Text, der zu EINEM Struktur-Aufruf
    // zusammengefügt wird.
    const teile: string[] = [];
    for (const paket of aufbereitung.pakete) {
      yield* meldePaket(paket, aufbereitung.pakete.length, undefined);
      try {
        const inhalt = await paket.laden();
        teile.push(inhalt.text ?? "");
      } catch (e) {
        console.error("[manual-extract] ocr:", (e as Error).message);
        yield {
          type: "error",
          error: fehlertext(e, "Die Seiten konnten nicht gelesen werden."),
        };
        return;
      }
    }
    yield {
      type: "info",
      message: "Fakten werden aus dem erkannten Text extrahiert …",
    };
    try {
      const antwort = await generateJson(provider, {
        prompt: paketPrompt(extractPrompt, teile.join("\n\n")),
        schema: outputJsonSchema,
        maxTokens: 64000,
        apiKey,
        zweck: "Extraktion",
      });
      if (antwort.abgeschnitten) {
        yield {
          type: "error",
          error:
            "Die Antwort wurde abgeschnitten. Bitte kleineres Handbuch versuchen.",
        };
        return;
      }
      const bericht = parseFacts(antwort.json);
      yield* meldeHinweise(bericht.warnings, new Set());
      if (!bericht.result) {
        yield {
          type: "error",
          error:
            bericht.errors[0] ??
            "Aus dem erkannten Text ließen sich keine Tabellen lesen.",
        };
        return;
      }
      parsed = bericht.result;
    } catch (e) {
      console.error("[manual-extract] mlx:", (e as Error).message);
      yield {
        type: "error",
        error: fehlertext(e, "Die Extraktion ist fehlgeschlagen."),
      };
      return;
    }
  } else {
    const erste = yield* durchgang(provider, aufbereitung, {
      apiKey,
      model: erstesModell,
      prompt: extractPrompt,
    });
    if (erste === "abort") return;
    parsed = mergeFactResults(erste);

    // Auto-Eskalation: fand das günstige Modell KEINE einzige Tabelle, mit dem
    // stärkeren Sonnet nachlegen (nur bei Provider "auto"). Kostet nur dann
    // extra, wenn Haiku ohnehin nichts geliefert hätte. Das ist Extraktions-
    // wissen — „das Ergebnis ist leer" weiß kein Anbieter-Adapter.
    if (provider === "auto" && istLeer(parsed)) {
      const stark = SONNET_MODEL();
      yield {
        type: "info",
        message: `Günstiges Modell fand keine Tabellen — schalte auf ${stark} …`,
      };
      const zweite = yield* durchgang(provider, aufbereitung, {
        apiKey,
        model: stark,
        prompt: extractPrompt,
      });
      if (zweite === "abort") return;
      parsed = mergeFactResults(zweite);
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
  await upsertModelKnowledge({ userId, machine, result: parsed, visibility });
  const counts: Record<string, number> = {};
  for (const t of present) counts[t] = parsed[t].rows.length;
  yield { type: "done", counts };
}
