"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Textarea } from "@/components/ui/input";
import { resetPrompt, savePrompt } from "@/db/actions/prompts";
import type { FormState } from "@/db/actions/form-state";

/*
  Editor für EINEN KI-Prompt (globaler Standard-Override). Muster wie der
  E-Mail-Vorlagen-Editor: Textarea + Speichern, „Zurücksetzen" nur, wenn eine
  Abweichung vom Code-Standard gespeichert ist. Hersteller-/Generation-Overrides
  kommen in Phase 2. Platzhalter {{…}} MÜSSEN erhalten bleiben.
*/
export function PromptEditor({
  promptKey,
  label,
  beschreibung,
  platzhalter,
  vorlage,
  angepasst,
}: {
  promptKey: string;
  label: string;
  beschreibung: string;
  platzhalter: string[];
  vorlage: string;
  angepasst: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const res = await savePrompt(prev, fd);
      if (res.message) router.refresh();
      return res;
    },
    {},
  );

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{label}</h3>
        {angepasst ? (
          <span className="rounded-full border border-[var(--color-accent)] px-2 py-0.5 text-xs text-[var(--color-accent)]">
            angepasst
          </span>
        ) : (
          <span className="text-xs text-[var(--color-muted)]">Standard</span>
        )}
      </div>
      <p className="text-sm text-[var(--color-muted)]">{beschreibung}</p>
      {platzhalter.length > 0 ? (
        <p className="text-xs text-[var(--color-muted)]">
          Platzhalter (unbedingt behalten):{" "}
          <span className="font-mono">{platzhalter.join("  ")}</span>
        </p>
      ) : null}

      <form action={formAction} className="space-y-2">
        <input type="hidden" name="key" value={promptKey} />
        <Textarea
          name="vorlage"
          defaultValue={vorlage}
          rows={14}
          required
          className="font-mono text-xs"
        />
        <FormFeedback state={state} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichere…" : "Speichern"}
        </Button>
      </form>

      {/* Zurücksetzen als EIGENES Server-Formular (der ConfirmButton submittet
          das umgebende Formular — resetPrompt löscht den Override). */}
      {angepasst ? (
        <form action={resetPrompt}>
          <input type="hidden" name="key" value={promptKey} />
          <ConfirmButton
            question="Auf den Standard zurücksetzen? Der gespeicherte Prompt wird gelöscht."
            confirmLabel="Ja, zurücksetzen"
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
          >
            Auf Standard zurücksetzen
          </ConfirmButton>
        </form>
      ) : null}
    </Card>
  );
}
