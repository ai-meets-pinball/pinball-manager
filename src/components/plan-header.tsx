"use client";

import { useActionState, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { deletePlan, renamePlan } from "@/db/actions/maintenance-plans";
import type { FormState } from "@/db/actions/form-state";

/*
  Kopf eines Plans (nur für Manager): der Name wird als TITEL angezeigt, nicht in
  einem offenen Eingabefeld (das wirkte wie ein leeres Feld, obwohl der Titel
  schon feststand). Der Stift schaltet auf Bearbeiten (Autofokus, Escape/
  Abbrechen verwerfen, Speichern schließt bei Erfolg) — Muster wie GenerationRow.
  Löschen entkoppelt verknüpfte Maschinen (ihre Punkte werden eigene Kopien).
*/
export function PlanHeader({
  planId,
  name,
}: {
  planId: string;
  name: string;
}) {
  const [bearbeiten, setBearbeiten] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    renamePlan,
    {},
  );

  // Bei Erfolg schließen (die Seite zeigt nach revalidatePath den neuen Namen).
  // „adjust state during render": neues state-Objekt = Antwort kam, kein useEffect.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.message) setBearbeiten(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {bearbeiten ? (
        <form
          action={formAction}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="planId" value={planId} />
          <Input
            name="name"
            defaultValue={name}
            autoFocus
            aria-label="Neuer Name"
            maxLength={80}
            className="max-w-56"
            onKeyDown={(e) => {
              if (e.key === "Escape") setBearbeiten(false);
            }}
          />
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? "Speichern…" : "Speichern"}
          </Button>
          <button
            type="button"
            onClick={() => setBearbeiten(false)}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          >
            Abbrechen
          </button>
          <FormFeedback state={state} />
        </form>
      ) : (
        <>
          <h2 className="text-lg font-semibold">{name}</h2>
          <button
            type="button"
            onClick={() => setBearbeiten(true)}
            aria-label="Umbenennen"
            title="Umbenennen"
            className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          >
            <Pencil size={16} />
          </button>
        </>
      )}
      <form action={deletePlan} className="ml-auto">
        <input type="hidden" name="planId" value={planId} />
        <ConfirmButton
          question="Plan löschen? Verknüpfte Maschinen werden entkoppelt — ihre Punkte werden eigene, editierbare Kopien; die Historie bleibt."
          confirmLabel="Ja, löschen"
        >
          <Trash2 size={13} /> Plan löschen
        </ConfirmButton>
      </form>
    </div>
  );
}
