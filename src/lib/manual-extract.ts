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
Extrahiere AUSSCHLIESSLICH die technischen Referenztabellen, sofern im Handbuch vorhanden:
- coils: Spulen-/Solenoid-Tabelle (Nummer, Bezeichnung, Ort, ggf. Sicherung/Transistor)
- switches: Switch-Matrix (Nummer/Position, Bezeichnung)
- lamps: Lampenmatrix (Nummer/Position, Bezeichnung)
- fuses: Sicherungen (Bezeichnung, Wert/Ampere, Zweck)
- parts: Teileliste (Teilenummer, Bezeichnung)
- rules: einstellbare Regeln/Adjustments (Name, Standard/Werte)

Gib je Tabelle die Spaltenüberschriften ("columns") und die Zeilen ("rows", je Zelle ein String) zurück.
NUR reine Fakten aus diesen Tabellen — KEINEN Fließtext, KEINE Spielregeln-Erklärungen, KEINE ganzen Seiten,
KEINE Beschreibungen. Fehlt eine Tabelle im Handbuch, gib für sie leere "columns" und "rows" zurück.`;

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

  let parsed: ReturnType<typeof extractSchema.parse>;
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
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
    });

    if (response.stop_reason === "refusal") {
      return { error: "Die Verarbeitung wurde abgelehnt." };
    }
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { error: "Es konnten keine Daten extrahiert werden." };
    }
    console.error(
      `[manual-extract] ${file.name} (${Math.round(file.size / 1024)} KB): in=${response.usage.input_tokens} out=${response.usage.output_tokens} tokens`,
    );
    parsed = extractSchema.parse(JSON.parse(textBlock.text));
  } catch (e) {
    console.error("[manual-extract]", (e as Error).message);
    return { error: "Extraktion fehlgeschlagen. Bitte später erneut versuchen." };
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
