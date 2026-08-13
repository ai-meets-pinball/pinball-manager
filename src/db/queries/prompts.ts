import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { generations, machineModels, promptOverrides } from "@/db/schema";
import {
  DEFAULT_PROMPTS,
  renderPrompt,
  waehleVorlage,
  type PromptKey,
  type PromptQuelle,
} from "@/lib/prompts";

/*
  Auflösen der KI-Prompts: STANDARD aus dem Code (lib/prompts.ts), ABWEICHUNG aus
  `prompt_overrides`. `resolvePrompt` wählt den spezifischsten Treffer
  (Generation > Hersteller > global > Code-Standard) und rendert die Platzhalter.
  IMMER mit Fallback auf den Code-Standard — ein fehlender/kaputter Override oder
  eine noch fehlende Tabelle darf ein KI-Feature nie brechen.
*/
export async function resolvePrompt(
  key: PromptKey,
  ctx: {
    hersteller?: string | null;
    generationId?: string | null;
    vars?: Record<string, string>;
  } = {},
): Promise<{ text: string; quelle: PromptQuelle }> {
  try {
    const rows = await db
      .select({
        hersteller: promptOverrides.hersteller,
        generationId: promptOverrides.generationId,
        vorlage: promptOverrides.vorlage,
      })
      .from(promptOverrides)
      .where(eq(promptOverrides.key, key));
    const { vorlage, quelle } = waehleVorlage(key, rows, ctx);
    return { text: renderPrompt(vorlage, ctx.vars ?? {}), quelle };
  } catch (e) {
    // Fehlende Tabelle / DB-Problem darf ein KI-Feature nie brechen.
    console.error("[prompts] resolvePrompt fiel auf Standard zurück:", e);
    return {
      text: renderPrompt(DEFAULT_PROMPTS[key].vorlage, ctx.vars ?? {}),
      quelle: "standard",
    };
  }
}

/** Alle Overrides eines Prompts (für die Admin-Übersicht), mit Generation-Name. */
export async function getPromptOverrides(key: PromptKey) {
  return db
    .select({
      id: promptOverrides.id,
      hersteller: promptOverrides.hersteller,
      generationId: promptOverrides.generationId,
      generationName: generations.name,
      vorlage: promptOverrides.vorlage,
      updatedAt: promptOverrides.updatedAt,
    })
    .from(promptOverrides)
    .leftJoin(generations, eq(generations.id, promptOverrides.generationId))
    .where(eq(promptOverrides.key, key))
    .orderBy(asc(promptOverrides.hersteller));
}

/** Der GLOBALE Override eines Prompts (oder null) — für den Standard-Editor. */
export async function getGlobalPromptOverride(key: PromptKey) {
  const [row] = await db
    .select()
    .from(promptOverrides)
    .where(
      and(
        eq(promptOverrides.key, key),
        isNull(promptOverrides.hersteller),
        isNull(promptOverrides.generationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Distinct Hersteller (für den Scope-Picker). */
export async function getHerstellerListe(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ h: machineModels.hersteller })
    .from(machineModels)
    .orderBy(asc(machineModels.hersteller));
  return rows.map((r) => r.h).filter((h): h is string => Boolean(h));
}

/** Generationen (für den Scope-Picker). */
export async function getGenerationenListe() {
  return db
    .select({ id: generations.id, name: generations.name })
    .from(generations)
    .orderBy(asc(generations.name));
}
