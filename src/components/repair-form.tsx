"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { FormState } from "@/db/actions/repairs";

type Fault = { id: string; beschreibung: string; status: string };

type RepairValues = {
  id: string;
  faultId: string | null;
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
  defaultFaultId,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  machineId: string;
  faults: Fault[];
  repair?: RepairValues;
  defaultFaultId?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );
  const [faultId, setFaultId] = useState(
    repair?.faultId ?? defaultFaultId ?? "",
  );

  // Symptom wird nur ANGEZEIGT (read-only) — es lebt am Fehler, nie an der Reparatur.
  const selectedFault = faults.find((f) => f.id === faultId);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <input type="hidden" name="machineId" value={machineId} />
      {repair ? <input type="hidden" name="id" value={repair.id} /> : null}

      <Field
        label="Verknüpfter Fehler (optional)"
        hint="Reparatur mit Status „erledigt“ setzt den verknüpften Fehler auf „behoben“."
      >
        <Select
          name="faultId"
          value={faultId}
          onChange={(e) => setFaultId(e.target.value)}
        >
          <option value="">— Kein Fehler —</option>
          {faults.map((f) => (
            <option key={f.id} value={f.id}>
              [{f.status}] {f.beschreibung.slice(0, 60)}
            </option>
          ))}
        </Select>
      </Field>

      {selectedFault ? (
        <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-border)]/20 p-3 text-sm">
          <p className="text-xs font-medium text-[var(--color-muted)]">
            Symptom (am Fehler)
          </p>
          <p className="mt-1 whitespace-pre-wrap">
            {selectedFault.beschreibung}
          </p>
        </div>
      ) : null}

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
          <Input
            name="zeit"
            type="number"
            defaultValue={repair?.zeit ?? ""}
          />
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
