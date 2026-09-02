"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { ICON_BTN } from "@/components/ui/icon-button";
import { Field, Input } from "@/components/ui/input";
import { logCompletion } from "@/db/actions/maintenance";
import type { FormState } from "@/db/actions/form-state";

/*
  „Erledigt eintragen" je Wartungspunkt: der Haken in der Zeile öffnet einen
  kleinen Dialog (Datum heute vorbelegt, optionale Notiz). Der Eintrag landet in
  der Historie; die Server Action verschiebt die Fälligkeit und revalidiert die
  Seite. Vorher ein Toggle-Button mit Inline-Formular unter jeder Zeile — am
  Gerät (Handy) kostete das 3–4 Zeilen je Punkt.
*/
export function MaintenanceCompleteButton({
  machineId,
  taskId,
  titel,
}: {
  machineId: string;
  taskId: string;
  titel: string;
}) {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        aria-label={`${titel} als erledigt eintragen`}
        title="Erledigt eintragen"
        className={`${ICON_BTN} hover:text-[var(--color-success)]`}
      >
        <Check size={14} />
      </button>
      {offen ? (
        <ErledigtDialog
          machineId={machineId}
          taskId={taskId}
          titel={titel}
          onClose={() => setOffen(false)}
        />
      ) : null}
    </>
  );
}

/* Nur gemountet, solange offen (siehe ActionDialog): frischer Zustand je
   Öffnung; Erfolg (state.ok) schließt. */
function ErledigtDialog({
  machineId,
  taskId,
  titel,
  onClose,
}: {
  machineId: string;
  taskId: string;
  titel: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    logCompletion,
    {},
  );
  // Lokaler Kalendertag (en-CA = YYYY-MM-DD) — toISOString wäre UTC und abends
  // in Deutschland schon der Vortag.
  const heute = new Date().toLocaleDateString("en-CA");

  return (
    <ActionDialog onClose={onClose} ok={Boolean(state.ok)}>
      <form action={formAction} className="space-y-4 p-5">
        <div>
          <h3 className="text-base font-semibold">Erledigt eintragen</h3>
          <p className="text-sm text-[var(--color-muted)]">{titel}</p>
        </div>
        <input type="hidden" name="machineId" value={machineId} />
        <input type="hidden" name="taskId" value={taskId} />
        <Field label="Datum">
          <Input name="datum" type="date" defaultValue={heute} required />
        </Field>
        <Field label="Notiz (optional)">
          <Input name="notiz" placeholder="z. B. Gummis erneuert" />
        </Field>
        <FormFeedback state={state} />
        <div className="flex justify-end gap-2">
          <DialogAbbrechen />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "…" : "Eintragen"}
          </Button>
        </div>
      </form>
    </ActionDialog>
  );
}
