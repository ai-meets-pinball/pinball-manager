"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { FormLeaveGuard } from "@/components/ui/form-leave-guard";
import type { FormState } from "@/db/actions/form-state";
import { datumISO } from "@/lib/format";

type TerminValues = {
  id: string;
  titel: string;
  notiz: string | null;
  datum: string; // yyyy-mm-dd (in der Edit-Route umgerechnet)
  erinnerungTageVorher: number;
  wiederholenMonate: number | null;
};

/* Anlegen/Bearbeiten eines Termins (datiertes Ereignis) — Vorbild
   MaintenanceTaskForm. Datum als type="date" (default heute). */
export function TerminForm({
  action,
  machineId,
  termin,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  machineId: string;
  termin?: TerminValues;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );
  const heute = datumISO(new Date());

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <input type="hidden" name="machineId" value={machineId} />
      {termin ? <input type="hidden" name="id" value={termin.id} /> : null}

      <Field label="Termin / Ereignis">
        <Input
          name="titel"
          required
          placeholder="z. B. Batterie wechseln"
          defaultValue={termin?.titel ?? ""}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Datum">
          <Input
            name="datum"
            type="date"
            required
            defaultValue={termin?.datum ?? heute}
          />
        </Field>
        <Field label="Erinnerung (Tage vorher)" hint="Standard: 7 Tage.">
          <Input
            name="erinnerungTageVorher"
            type="number"
            min="0"
            defaultValue={termin?.erinnerungTageVorher ?? 7}
          />
        </Field>
      </div>

      <Field
        label="Wiederholen alle … Monate (optional)"
        hint="Leer = einmalig. Nach »Erledigt« rückt der Termin um diese Monate weiter (z. B. 24 für die Batterie)."
      >
        <Input
          name="wiederholenMonate"
          type="number"
          min="1"
          placeholder="— einmalig —"
          defaultValue={termin?.wiederholenMonate ?? ""}
        />
      </Field>

      <Field label="Notiz (optional)">
        <Textarea name="notiz" defaultValue={termin?.notiz ?? ""} />
      </Field>

      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Speichern…" : "Speichern"}
        </Button>
        <FormLeaveGuard backHref={`/machines/${machineId}?bereich=termine`} />
      </div>
    </form>
  );
}
