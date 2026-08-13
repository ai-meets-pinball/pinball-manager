"use client";

import { useActionState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiProviderField } from "@/components/ui/ai-provider-field";
import { RepairForm } from "@/components/repair-form";
import { createRepair } from "@/db/actions/repairs";
import { generateRepairSuggestion } from "@/db/actions/repair-suggestion";
import type { RepairSuggestState } from "@/db/actions/repair-suggestion";
import type { AiProvider } from "@/lib/ai/provider";

/*
  Fehler → KI-Reparaturvorschlag (Roadmap-Phase 3). Auf Knopfdruck erzeugt die
  KI aus Symptom + Maschinen-Wissen einen Vorschlag (Diagnose/Maßnahme/Teile)
  und füllt damit eine NEUE Reparatur vor — der Nutzer prüft und speichert über
  das übliche Reparatur-Formular (createRepair). Nur mit Schreibrecht.
*/
export function RepairSuggestButton({
  machineId,
  fault,
  providers,
  centralKey,
}: {
  machineId: string;
  fault: { id: string; beschreibung: string; status: string };
  providers: AiProvider[];
  centralKey: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    RepairSuggestState,
    FormData
  >(generateRepairSuggestion, {});

  return (
    <details className="rounded-[var(--radius)] border border-dashed border-[var(--color-border)]">
      <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-sm text-[var(--color-primary)] hover:underline">
        <Sparkles size={14} /> KI-Reparaturvorschlag
      </summary>
      <div className="space-y-3 border-t border-[var(--color-border)] p-3">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="faultId" value={fault.id} />
          <AiProviderField providers={providers} centralKey={centralKey} />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {pending ? "Erzeuge Vorschlag…" : "Vorschlag generieren"}
          </Button>
          {state.error ? (
            <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
          ) : null}
        </form>

        {state.vorschlag ? (
          <div className="space-y-3 border-t border-[var(--color-border)] pt-3">
            <p className="text-xs text-[var(--color-muted)]">
              KI-Vorschlag — bitte prüfen und anpassen, bevor du speicherst.
              {state.vorschlag.hinweis ? ` ${state.vorschlag.hinweis}` : ""}
            </p>
            <RepairForm
              action={createRepair}
              machineId={machineId}
              faults={[fault]}
              selectedFaultIds={[fault.id]}
              defaults={{
                diagnose: state.vorschlag.diagnose,
                massnahme: state.vorschlag.massnahme,
                teile: state.vorschlag.teile,
              }}
            />
          </div>
        ) : null}
      </div>
    </details>
  );
}
