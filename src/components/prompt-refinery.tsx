"use client";

import { useActionState } from "react";
import { FlaskConical, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiProviderField } from "@/components/ui/ai-provider-field";
import { Field, Input } from "@/components/ui/input";
import { testePrompt, verbesserePrompt } from "@/db/actions/prompts";
import type {
  PromptTestState,
  PromptVerbesserState,
} from "@/db/actions/prompts";
import type { AiProvider } from "@/lib/ai/provider";

/*
  Refinery zu EINEM Prompt-Entwurf: an Beispiel-Werten testen (Prompt rendern +
  durch den KI-Seam) und/oder von der KI eine überarbeitete Fassung vorschlagen
  lassen. Der aktuelle Entwurf kommt als `text` aus dem Editor; „Übernehmen"
  schreibt eine Verbesserung über `onApply` zurück in die Textarea. Beides kostet
  Tokens und läuft über die gewählte Anbieter-Wahl (BYO-Key möglich).
*/
export function PromptRefinery({
  promptKey,
  text,
  zeigeBeispielFelder,
  providers,
  centralKey,
  onApply,
}: {
  promptKey: string;
  text: string;
  /** Beispiel-Eingaben (Hersteller/Symptom …) anzeigen? (nicht bei statischen Prompts) */
  zeigeBeispielFelder: boolean;
  providers: AiProvider[];
  centralKey: boolean;
  onApply: (text: string) => void;
}) {
  const [testState, testAction, testPending] = useActionState<
    PromptTestState,
    FormData
  >(testePrompt, {});
  const [verbState, verbAction, verbPending] = useActionState<
    PromptVerbesserState,
    FormData
  >(verbesserePrompt, {});

  return (
    <details className="rounded-[var(--radius)] border border-dashed border-[var(--color-border)]">
      <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]">
        <FlaskConical size={14} /> Refinery — testen &amp; verbessern (kostet
        Tokens)
      </summary>
      <div className="space-y-4 border-t border-[var(--color-border)] p-3">
        {/* Test-Lauf */}
        <form action={testAction} className="space-y-3">
          <input type="hidden" name="key" value={promptKey} />
          <input type="hidden" name="vorlage" value={text} />
          {zeigeBeispielFelder ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Hersteller (Beispiel)">
                <Input name="hersteller" placeholder="Bally" />
              </Field>
              <Field label="Modell (Beispiel)">
                <Input name="modell" placeholder="Fireball" />
              </Field>
              <Field label="Baujahr (Beispiel)">
                <Input name="baujahr" placeholder="1972" />
              </Field>
              <Field label="Symptom (Beispiel)">
                <Input
                  name="symptom"
                  placeholder="Linker Flipper ohne Funktion"
                />
              </Field>
            </div>
          ) : null}
          <AiProviderField providers={providers} centralKey={centralKey} />
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={testPending}
          >
            {testPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FlaskConical size={16} />
            )}
            {testPending ? "Teste…" : "Test-Lauf"}
          </Button>
          {testState.error ? (
            <p className="text-sm text-[var(--color-danger)]">
              {testState.error}
            </p>
          ) : null}
          {testState.output ? (
            <pre className="max-h-80 overflow-auto rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-inset)] p-2 text-xs">
              {testState.output}
            </pre>
          ) : null}
        </form>

        {/* KI-Verbesserung */}
        <form
          action={verbAction}
          className="space-y-3 border-t border-[var(--color-border)] pt-3"
        >
          <input type="hidden" name="key" value={promptKey} />
          <input type="hidden" name="vorlage" value={text} />
          <AiProviderField providers={providers} centralKey={centralKey} />
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={verbPending}
          >
            {verbPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {verbPending ? "Verbessere…" : "Prompt verbessern lassen"}
          </Button>
          {verbState.error ? (
            <p className="text-sm text-[var(--color-danger)]">
              {verbState.error}
            </p>
          ) : null}
          {verbState.verbessert ? (
            <div className="space-y-2">
              <pre className="max-h-80 overflow-auto rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-inset)] p-2 text-xs">
                {verbState.verbessert}
              </pre>
              <Button
                type="button"
                size="sm"
                onClick={() => onApply(verbState.verbessert!)}
              >
                In den Editor übernehmen
              </Button>
              <p className="text-xs text-[var(--color-muted)]">
                Übernimmt den Text nur in die Textarea — Speichern nicht
                vergessen.
              </p>
            </div>
          ) : null}
        </form>
      </div>
    </details>
  );
}
