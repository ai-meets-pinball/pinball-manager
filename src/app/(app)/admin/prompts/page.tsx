import { PromptEditor } from "@/components/prompt-editor";
import { PromptOverrideNeu } from "@/components/prompt-override-neu";
import { Card } from "@/components/ui/card";
import {
  getGenerationenListe,
  getHerstellerListe,
  getPromptOverrides,
} from "@/db/queries";
import { DEFAULT_PROMPTS, PROMPT_KEYS } from "@/lib/prompts";

/*
  KI-Prompt-Refinery (Super-Admin; Guard im admin/layout). Je Prompt: der
  globale Standard + beliebig viele Hersteller-/Generation-Overrides. Standard
  liegt im Code (lib/prompts.ts), hier werden nur Abweichungen gespeichert
  (prompt_overrides). Der spezifischste Override gewinnt (resolvePrompt).
*/
export default async function PromptsPage() {
  const [herstellerListe, generationen] = await Promise.all([
    getHerstellerListe().catch(() => [] as string[]),
    getGenerationenListe().catch(() => [] as { id: string; name: string }[]),
  ]);

  const prompts = await Promise.all(
    PROMPT_KEYS.map(async (key) => ({
      key,
      def: DEFAULT_PROMPTS[key],
      overrides: await getPromptOverrides(key).catch(() => []),
    })),
  );

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Prompts</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Die Prompts der KI-Funktionen bearbeiten — global oder pro Hersteller/
          Generation (der spezifischste gewinnt). Standard liegt im Code; hier
          werden nur Abweichungen gespeichert. Die {"{{Platzhalter}}"} müssen
          erhalten bleiben; strukturelle Teile (JSON-Form, Fakten-Spalten) sind
          bewusst nicht editierbar.
        </p>
      </div>

      {prompts.map(({ key, def, overrides }) => {
        const global = overrides.find((o) => !o.hersteller && !o.generationId);
        const scoped = overrides.filter((o) => o.hersteller || o.generationId);
        return (
          <Card key={key} className="space-y-3">
            <div className="space-y-1">
              <h3 className="font-semibold">{def.label}</h3>
              <p className="text-sm text-[var(--color-muted)]">
                {def.beschreibung}
              </p>
              {def.platzhalter.length > 0 ? (
                <p className="text-xs text-[var(--color-muted)]">
                  Platzhalter:{" "}
                  <span className="font-mono">
                    {def.platzhalter.join("  ")}
                  </span>
                </p>
              ) : null}
            </div>

            <PromptEditor
              promptKey={key}
              label="Standard"
              vorlage={global?.vorlage ?? def.vorlage}
              existiert={Boolean(global)}
            />

            {scoped.map((o) => (
              <PromptEditor
                key={o.id}
                promptKey={key}
                label="Override"
                hersteller={o.hersteller ?? ""}
                generationId={o.generationId ?? ""}
                scopeChip={o.hersteller ?? o.generationName ?? "?"}
                vorlage={o.vorlage}
                existiert
              />
            ))}

            {def.herstellerScoped || def.generationScoped ? (
              <PromptOverrideNeu
                promptKey={key}
                standard={global?.vorlage ?? def.vorlage}
                hersteller={herstellerListe}
                generationen={generationen}
                herstellerScoped={def.herstellerScoped}
                generationScoped={def.generationScoped}
              />
            ) : null}
          </Card>
        );
      })}
    </section>
  );
}
