"use client";

import { useActionState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiProviderField } from "@/components/ui/ai-provider-field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { generateRepairSuggestion } from "@/db/actions/repair-suggestion";
import type { RepairSuggestState } from "@/db/actions/repair-suggestion";
import type { AiProvider } from "@/lib/ai/provider";

/*
  Fehler → KI-Reparaturvorschlag (Roadmap-Phase 3), als Baustein der Seite
  „Neue Reparatur": auf Knopfdruck erzeugt die KI aus Symptom + Maschinen-
  Wissen Diagnose/Maßnahme/Teile und reicht sie per onVorschlag ans Reparatur-
  Formular weiter, das seine Felder damit füllt. Der Mensch prüft und speichert
  wie gewohnt. Ein eigenes <form>, weil Anbieter/Schlüssel nur an die
  Vorschlags-Action gehen sollen — nicht mit ins Speichern der Reparatur.
*/
export type KiVorschlag = { diagnose: string; massnahme: string; teile: string };

export function KiVorschlagHolen({
  faultId,
  providers,
  centralKey,
  onVorschlag,
}: {
  faultId: string;
  providers: AiProvider[];
  centralKey: boolean;
  onVorschlag: (v: KiVorschlag) => void;
}) {
  const [state, formAction, pending] = useActionState<
    RepairSuggestState,
    FormData
  >(async (prev, fd) => {
    const antwort = await generateRepairSuggestion(prev, fd);
    if (antwort.vorschlag) onVorschlag(antwort.vorschlag);
    return antwort;
  }, {});

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-[var(--radius)] border border-dashed border-[var(--color-border)] p-3"
    >
      <input type="hidden" name="faultId" value={faultId} />
      <AiProviderField providers={providers} centralKey={centralKey} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          {pending ? "Hole Vorschlag…" : "Vorschlag von der KI holen"}
        </Button>
        {state.vorschlag ? (
          <p className="text-xs text-[var(--color-muted)]">
            Vorschlag übernommen — bitte prüfen und anpassen, bevor du
            speicherst.
            {state.vorschlag.hinweis ? ` ${state.vorschlag.hinweis}` : ""}
          </p>
        ) : null}
      </div>
      <FormFeedback state={state} />
    </form>
  );
}
