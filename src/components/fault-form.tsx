"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/input";
import type { FormState } from "@/db/actions/faults";

const KATEGORIEN = ["Spule", "Schalter", "Anzeige", "mechanisch", "Sonstiges"];

type FaultValues = {
  id: string;
  beschreibung: string;
  kategorie: string | null;
  prioritaet: "niedrig" | "mittel" | "hoch";
  status: "offen" | "in Arbeit" | "behoben";
};

export function FaultForm({
  action,
  machineId,
  fault,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  machineId: string;
  fault?: FaultValues;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <input type="hidden" name="machineId" value={machineId} />
      {fault ? <input type="hidden" name="id" value={fault.id} /> : null}

      <Field label="Beschreibung / Symptom">
        <Textarea
          name="beschreibung"
          required
          defaultValue={fault?.beschreibung}
          placeholder="Was funktioniert nicht? Wann tritt es auf?"
        />
      </Field>

      <Field label="Kategorie">
        <Select name="kategorie" defaultValue={fault?.kategorie ?? ""}>
          <option value="">— Keine —</option>
          {KATEGORIEN.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Priorität">
          <Select name="prioritaet" defaultValue={fault?.prioritaet ?? "mittel"}>
            <option value="niedrig">niedrig</option>
            <option value="mittel">mittel</option>
            <option value="hoch">hoch</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={fault?.status ?? "offen"}>
            <option value="offen">offen</option>
            <option value="in Arbeit">in Arbeit</option>
            <option value="behoben">behoben</option>
          </Select>
        </Field>
      </div>

      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
