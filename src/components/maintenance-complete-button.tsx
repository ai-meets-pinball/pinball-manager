"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { logCompletion, type FormState } from "@/db/actions/maintenance";

/*
  „Erledigt eintragen" je Wartungspunkt: ein Toggle öffnet ein kompaktes Formular
  (Datum + optionale Notiz). Der Eintrag landet in der Historie; die Server Action
  verschiebt die Fälligkeit und revalidiert die Seite.
*/
export function MaintenanceCompleteButton({
  machineId,
  taskId,
}: {
  machineId: string;
  taskId: string;
}) {
  const [offen, setOffen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    logCompletion,
    {},
  );
  const heute = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-success)] hover:underline"
      >
        <Check size={14} /> Erledigt eintragen
      </button>

      {offen ? (
        <form
          action={formAction}
          className="mt-2 flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3"
        >
          <input type="hidden" name="machineId" value={machineId} />
          <input type="hidden" name="taskId" value={taskId} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Datum">
              <Input name="datum" type="date" defaultValue={heute} />
            </Field>
            <Field label="Notiz (optional)">
              <Input name="notiz" placeholder="z. B. Gummis erneuert" />
            </Field>
          </div>
          {state.error ? (
            <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
          ) : null}
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? "Speichern…" : "Als erledigt eintragen"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
