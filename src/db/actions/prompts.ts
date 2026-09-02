"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { promptOverrides } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/session";
import {
  DEFAULT_PROMPTS,
  PROMPT_KEYS,
  extractSpaltenBlock,
  fehlendePlatzhalter,
  overrideBelegt,
  renderPrompt,
  type PromptKey,
} from "@/lib/prompts";
import { resolveProvider } from "@/lib/ai/provider";
import { AiError, generateJson } from "@/lib/ai/generate";
import type { FormState } from "@/db/actions/form-state";

/*
  KI-Prompt-Overrides bearbeiten (nur Super-Admin) — Muster wie die E-Mail-
  Vorlagen (db/actions/email-templates.ts): Speichern = Upsert einer Override-
  Zeile, Zurücksetzen = Löschen (dann greift wieder der Code-Standard). Scope
  ist exklusiv: global | Hersteller | Generation.
*/
function gueltigerKey(k: string): k is PromptKey {
  return (PROMPT_KEYS as readonly string[]).includes(k);
}

export async function savePrompt(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const currentUser = await requireSuperAdmin();
  const key = String(formData.get("key") ?? "");
  const vorlage = String(formData.get("vorlage") ?? "").trim();
  const hersteller = String(formData.get("hersteller") ?? "").trim() || null;
  const generationId =
    String(formData.get("generationId") ?? "").trim() || null;

  if (!gueltigerKey(key)) return { error: "Unbekannter Prompt." };
  if (!vorlage) return { error: "Der Prompt darf nicht leer sein." };
  if (hersteller && generationId) {
    return { error: "Bereich ist entweder Hersteller ODER Generation." };
  }
  // Die Regel von der Seite („Platzhalter müssen erhalten bleiben") gilt wirklich.
  const fehlend = fehlendePlatzhalter(vorlage, DEFAULT_PROMPTS[key].platzhalter);
  if (fehlend.length > 0) {
    return { error: `Platzhalter fehlen: ${fehlend.join(", ")}` };
  }
  // „Override anlegen" darf einen bestehenden nicht still überschreiben —
  // dieselbe Regel (overrideBelegt, lib/prompts.ts), die im Formular die
  // belegten Bereiche aus der Auswahl nimmt.
  if (String(formData.get("modus") ?? "") === "neu") {
    const vorhanden = await db
      .select({
        hersteller: promptOverrides.hersteller,
        generationId: promptOverrides.generationId,
        vorlage: promptOverrides.vorlage,
      })
      .from(promptOverrides)
      .where(eq(promptOverrides.key, key));
    if (overrideBelegt(vorhanden, { hersteller, generationId })) {
      return {
        error: "Für diesen Bereich gibt es schon einen Override — bearbeite ihn oben.",
      };
    }
  }

  await db
    .insert(promptOverrides)
    .values({
      key,
      hersteller,
      generationId,
      vorlage,
      updatedBy: currentUser.id,
    })
    .onConflictDoUpdate({
      target: [
        promptOverrides.key,
        promptOverrides.hersteller,
        promptOverrides.generationId,
      ],
      set: { vorlage, updatedAt: new Date(), updatedBy: currentUser.id },
    });

  revalidatePath("/admin/prompts");
  return { message: "Prompt gespeichert." };
}

export async function resetPrompt(formData: FormData): Promise<void> {
  await requireSuperAdmin();
  const key = String(formData.get("key") ?? "");
  const hersteller = String(formData.get("hersteller") ?? "").trim() || null;
  const generationId =
    String(formData.get("generationId") ?? "").trim() || null;
  if (!gueltigerKey(key)) return;

  await db
    .delete(promptOverrides)
    .where(
      and(
        eq(promptOverrides.key, key),
        hersteller
          ? eq(promptOverrides.hersteller, hersteller)
          : isNull(promptOverrides.hersteller),
        generationId
          ? eq(promptOverrides.generationId, generationId)
          : isNull(promptOverrides.generationId),
      ),
    );

  revalidatePath("/admin/prompts");
}

/* ── Refinery: Test-Lauf + KI-Verbesserung ────────────────────────────────── */

export type PromptTestState = { error?: string; output?: string };

/** Den ENTWURF an Beispiel-Werten testen: rendern + durch den KI-Seam schicken
    (lockeres Schema, nur zur Ansicht). Kostet Tokens. */
export async function testePrompt(
  _prev: PromptTestState,
  formData: FormData,
): Promise<PromptTestState> {
  await requireSuperAdmin();
  const key = String(formData.get("key") ?? "");
  const vorlage = String(formData.get("vorlage") ?? "");
  if (!gueltigerKey(key)) return { error: "Unbekannter Prompt." };
  if (!vorlage.trim()) return { error: "Kein Prompt-Text zum Testen." };

  const vars: Record<string, string> = {
    hersteller: String(formData.get("hersteller") ?? "").trim() || "Bally",
    modell: String(formData.get("modell") ?? "").trim() || "Fireball",
    baujahr: String(formData.get("baujahr") ?? "").trim() || "1972",
    symptom:
      String(formData.get("symptom") ?? "").trim() ||
      "Linker Flipperfinger ohne Funktion",
    kategorie: String(formData.get("kategorie") ?? "").trim() || "Spule",
    wissen: "(Test — kein echtes Gerätewissen eingespielt)",
    spalten: extractSpaltenBlock(),
  };
  const prompt = renderPrompt(vorlage, vars);
  const provider = resolveProvider(formData);

  try {
    const antwort = await generateJson(provider, {
      prompt,
      schema: { type: "object", additionalProperties: true },
      maxTokens: 4000,
      apiKey: String(formData.get("apiKey") ?? ""),
      zweck: "Prompt-Test",
    });
    if (antwort.abgeschnitten) {
      return {
        error: "Antwort abgeschnitten — der Prompt liefert viel Output.",
      };
    }
    return { output: JSON.stringify(antwort.json, null, 2) };
  } catch (e) {
    if (e instanceof AiError) return { error: e.userMessage };
    return { error: (e as Error).message };
  }
}

export type PromptVerbesserState = { error?: string; verbessert?: string };

/** Die KI eine überarbeitete Fassung des Entwurfs vorschlagen lassen — mit
    Auflage, alle {{Platzhalter}} und die Ausgabe-Struktur zu erhalten. */
export async function verbesserePrompt(
  _prev: PromptVerbesserState,
  formData: FormData,
): Promise<PromptVerbesserState> {
  await requireSuperAdmin();
  const key = String(formData.get("key") ?? "");
  const vorlage = String(formData.get("vorlage") ?? "");
  if (!gueltigerKey(key)) return { error: "Unbekannter Prompt." };
  if (!vorlage.trim()) return { error: "Kein Prompt-Text zum Verbessern." };

  const def = DEFAULT_PROMPTS[key];
  const meta = `Du bist ein erfahrener Prompt-Engineer. Verbessere den folgenden Prompt für die Funktion „${def.label}" (${def.beschreibung}).
Ziele: klarer, robuster, weniger mehrdeutig; Sprache Deutsch, Fachbegriffe der Flipper-Szene beibehalten.
WICHTIG: Behalte ALLE Platzhalter im Format {{name}} EXAKT bei (${def.platzhalter.join(", ") || "keine"}); füge keine neuen hinzu und entferne keine. Ändere NICHT die geforderte Ausgabe-/JSON-Struktur.
Gib das Ergebnis als JSON zurück: { "vorlage": "<verbesserter Prompt-Text>" }.

AKTUELLER PROMPT:
${vorlage}`;
  const provider = resolveProvider(formData);

  try {
    const antwort = await generateJson(provider, {
      prompt: meta,
      schema: {
        type: "object",
        properties: { vorlage: { type: "string" } },
        required: ["vorlage"],
        additionalProperties: false,
      },
      maxTokens: 8000,
      apiKey: String(formData.get("apiKey") ?? ""),
      zweck: "Prompt-Verbesserung",
    });
    const v = (antwort.json as { vorlage?: unknown } | null)?.vorlage;
    if (typeof v !== "string" || !v.trim()) {
      return { error: "Keine brauchbare Verbesserung erhalten." };
    }
    return { verbessert: v };
  } catch (e) {
    if (e instanceof AiError) return { error: e.userMessage };
    return { error: (e as Error).message };
  }
}
