"use server";

import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { machineData } from "@/db/schema";
import { requireMachineAccess } from "@/lib/session";
import { extractSchema, FACT_TYPES } from "@/lib/validators";

/*
  Phase-2-Pipeline: Handbuch (PDF) → Faktentabellen.

  Copyright-Leitplanken (PRD §6):
  - Upload nur mit Eigentums-/Rechtebestätigung (Attestation).
  - Das PDF wird NIE gespeichert: die Bytes leben nur im Request-Speicher, gehen
    direkt an Claude und werden danach verworfen (kein Storage, nichts zu löschen).
  - Claude extrahiert ausschließlich Faktentabellen (Nummern/Werte), keinen Text.
  - Nur diese Fakten landen in machine_data. Autorisierung erbt über die Maschine.
*/

export type ExtractState = { error?: string; counts?: Record<string, number> };

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB (In-Memory-Grenze, vgl. next.config.ts)

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
- switches → ["Sw/No", "Column", "Row", "Funktion"]
             (Switch-Matrix: Column/Row = Rasterposition; bei nicht-Matrix-Schaltern Column/Row = "")
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

/** API-/Netzwerkfehler in eine sichere, spezifische Meldung übersetzen. */
function apiErrorMessage(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "Claude-API-Key ist ungültig.";
  if (e instanceof Anthropic.PermissionDeniedError)
    return "Kein Zugriff auf Claude (Rechte oder Guthaben prüfen).";
  if (e instanceof Anthropic.NotFoundError)
    return "Modell nicht verfügbar — ANTHROPIC_MODEL prüfen.";
  if (e instanceof Anthropic.RateLimitError)
    return "Zu viele Anfragen an Claude. Bitte später erneut versuchen.";
  if (e instanceof Anthropic.APIConnectionError)
    return "Verbindung zu Claude fehlgeschlagen. Bitte später erneut versuchen.";
  return "Extraktion fehlgeschlagen. Bitte später erneut versuchen.";
}

/** Streamt den Extraktions-Call und liefert die vollständige Antwort. */
async function anthropicCall(apiKey: string, base64: string) {
  const client = new Anthropic({ apiKey });
  return client.messages
    .stream({
      model: MODEL,
      max_tokens: 64000,
      output_config: { format: { type: "json_schema", schema: outputJsonSchema } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            { type: "text", text: EXTRACT_PROMPT },
          ],
        },
      ],
    })
    .finalMessage();
}

export async function extractManualFacts(
  _prev: ExtractState,
  formData: FormData,
): Promise<ExtractState> {
  const machineId = String(formData.get("machineId"));
  // Autorisierung: Eigentümer ODER Club-Mitglied (kein RLS). Wirft sonst.
  await requireMachineAccess(machineId);

  if (formData.get("attest") !== "on") {
    return {
      error:
        "Bitte bestätige, dass du das Handbuch besitzt bzw. die Rechte hast, es zu verarbeiten.",
    };
  }

  const file = formData.get("manual");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bitte ein Handbuch als PDF auswählen." };
  }
  if (file.type !== "application/pdf") {
    return { error: "Nur PDF-Dateien werden unterstützt." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Datei zu groß (maximal 15 MB)." };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[manual-extract] ANTHROPIC_API_KEY ist nicht gesetzt");
    return { error: "Extraktion ist nicht konfiguriert (ANTHROPIC_API_KEY fehlt)." };
  }

  // PDF nur im Speicher: base64 → Claude. Danach wird `base64`/`file` verworfen (GC).
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  // Claude-Aufruf: gestreamt (Output > 16k braucht Streaming, sonst HTTP-Timeout;
  // hält auch die minutenlange Verbindung bei großen Handbüchern offen).
  let response: Awaited<ReturnType<typeof anthropicCall>>;
  try {
    response = await anthropicCall(apiKey, base64);
  } catch (e) {
    console.error("[manual-extract] API:", (e as Error).message);
    return { error: apiErrorMessage(e) };
  }

  console.error(
    `[manual-extract] ${file.name} (${Math.round(file.size / 1024)} KB): in=${response.usage.input_tokens} out=${response.usage.output_tokens} tokens, stop=${response.stop_reason}`,
  );

  if (response.stop_reason === "refusal") {
    return { error: "Die Verarbeitung wurde abgelehnt." };
  }
  if (response.stop_reason === "max_tokens") {
    return {
      error:
        "Das Handbuch ist sehr umfangreich — die Antwort wurde abgeschnitten. Bitte erneut versuchen oder ein kleineres/kompakteres PDF verwenden.",
    };
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { error: "Es konnten keine Daten extrahiert werden." };
  }

  let parsed: ReturnType<typeof extractSchema.parse>;
  try {
    parsed = extractSchema.parse(JSON.parse(extractJson(textBlock.text)));
  } catch (e) {
    console.error("[manual-extract] parse:", (e as Error).message);
    return { error: "Antwort konnte nicht ausgewertet werden. Bitte erneut versuchen." };
  }

  // Nur nicht-leere Tabellen behalten; vorhandene Fakten ersetzen (Replace-Semantik).
  const present = FACT_TYPES.filter((t) => parsed[t].rows.length > 0);
  const counts: Record<string, number> = {};

  await db.transaction(async (tx) => {
    await tx.delete(machineData).where(eq(machineData.machineId, machineId));
    for (const typ of present) {
      await tx.insert(machineData).values({ machineId, typ, daten: parsed[typ] });
      counts[typ] = parsed[typ].rows.length;
    }
  });

  revalidatePath(`/machines/${machineId}`);
  return { counts };
}
