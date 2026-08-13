import { PromptEditor } from "@/components/prompt-editor";
import { getGlobalPromptOverride } from "@/db/queries";
import { DEFAULT_PROMPTS, PROMPT_KEYS } from "@/lib/prompts";

/*
  KI-Prompt-Refinery (Super-Admin; Guard im admin/layout). Phase 1: die
  globalen Prompts bearbeiten. Standard liegt im Code (lib/prompts.ts), hier
  wird nur die Abweichung gespeichert (prompt_overrides). Hersteller-/
  Generation-Overrides + Test/Verbessern folgen in weiteren Phasen.
*/
export default async function PromptsPage() {
  const prompts = await Promise.all(
    PROMPT_KEYS.map(async (key) => {
      const override = await getGlobalPromptOverride(key).catch(() => null);
      const def = DEFAULT_PROMPTS[key];
      return {
        key,
        label: def.label,
        beschreibung: def.beschreibung,
        platzhalter: def.platzhalter,
        vorlage: override?.vorlage ?? def.vorlage,
        angepasst: Boolean(override),
      };
    }),
  );

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Prompts</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Die Prompts der KI-Funktionen bearbeiten. Der Standard liegt im Code;
          hier speicherst du Abweichungen. Die {"{{Platzhalter}}"} müssen
          erhalten bleiben, sonst fehlen dem Modell die Gerätedaten.
          Strukturelle Teile (JSON-Form, Fakten-Spalten) sind bewusst nicht
          editierbar.
        </p>
      </div>

      {prompts.map((p) => (
        <PromptEditor
          key={p.key}
          promptKey={p.key}
          label={p.label}
          beschreibung={p.beschreibung}
          platzhalter={p.platzhalter}
          vorlage={p.vorlage}
          angepasst={p.angepasst}
        />
      ))}
    </section>
  );
}
