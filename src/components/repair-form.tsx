"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { FormState } from "@/db/actions/form-state";

type Fault = { id: string; beschreibung: string; status: string };

type RepairValues = {
  id: string;
  diagnose: string | null;
  massnahme: string | null;
  teile: string | null;
  kosten: string | null;
  zeit: number | null;
  status: "offen" | "in Arbeit" | "erledigt";
};

export function RepairForm({
  action,
  machineId,
  faults,
  repair,
  selectedFaultIds = [],
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  machineId: string;
  faults: Fault[];
  repair?: RepairValues;
  /** Vorausgewählte Fehler (Bearbeiten: die verknüpften; Neu: aus ?faultId). */
  selectedFaultIds?: string[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );
  // Mehrere Fehler wählbar; das Symptom lebt am Fehler (hier nur Auswahl).
  const [checked, setChecked] = useState<Set<string>>(
    new Set(selectedFaultIds),
  );
  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <input type="hidden" name="machineId" value={machineId} />
      {repair ? <input type="hidden" name="id" value={repair.id} /> : null}

      <Field
        label="Behobene Fehler (optional)"
        hint="Eine Reparatur mit Status „erledigt“ setzt alle gewählten Fehler auf „behoben“."
      >
        {faults.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            Für diese Maschine sind keine Fehler erfasst.
          </p>
        ) : (
          <div className="space-y-1.5">
            {faults.map((f) => (
              <label key={f.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="faultIds"
                  value={f.id}
                  checked={checked.has(f.id)}
                  onChange={() => toggle(f.id)}
                  className="mt-1 accent-[var(--color-accent)]"
                />
                <span>
                  <span className="text-xs text-[var(--color-muted)]">
                    [{f.status}]
                  </span>{" "}
                  {f.beschreibung}
                </span>
              </label>
            ))}
          </div>
        )}
      </Field>

      <Field label="Diagnose">
        <Textarea name="diagnose" defaultValue={repair?.diagnose ?? ""} />
      </Field>
      <Field label="Maßnahme">
        <Textarea name="massnahme" defaultValue={repair?.massnahme ?? ""} />
      </Field>
      <Field label="Verbaute Teile">
        <Input name="teile" defaultValue={repair?.teile ?? ""} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Kosten (€)">
          <Input
            name="kosten"
            type="number"
            step="0.01"
            defaultValue={repair?.kosten ?? ""}
          />
        </Field>
        <Field label="Zeitaufwand (Minuten)">
          <Input name="zeit" type="number" defaultValue={repair?.zeit ?? ""} />
        </Field>
      </div>

      <Field label="Status">
        <Select name="status" defaultValue={repair?.status ?? "offen"}>
          <option value="offen">offen</option>
          <option value="in Arbeit">in Arbeit</option>
          <option value="erledigt">erledigt</option>
        </Select>
      </Field>

      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
