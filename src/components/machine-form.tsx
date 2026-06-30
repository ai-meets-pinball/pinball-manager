"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import type { FormState } from "@/db/actions/machines";

type Club = { id: string; name: string };

type MachineValues = {
  id: string;
  hersteller: string;
  modell: string;
  baujahr: number | null;
  opdbRef: string | null;
  ipdbRef: string | null;
  clubId: string | null;
};

export function MachineForm({
  action,
  clubs,
  machine,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  clubs: Club[];
  machine?: MachineValues;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {machine ? <input type="hidden" name="id" value={machine.id} /> : null}

      <Field label="Hersteller">
        <Input name="hersteller" required defaultValue={machine?.hersteller} />
      </Field>
      <Field label="Modell">
        <Input name="modell" required defaultValue={machine?.modell} />
      </Field>
      <Field label="Baujahr">
        <Input
          name="baujahr"
          type="number"
          defaultValue={machine?.baujahr ?? ""}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="OPDB-Referenz">
          <Input name="opdbRef" defaultValue={machine?.opdbRef ?? ""} />
        </Field>
        <Field label="IPDB-Referenz">
          <Input name="ipdbRef" defaultValue={machine?.ipdbRef ?? ""} />
        </Field>
      </div>

      <Field label="Club (optional)" hint="Geteilt mit den Mitgliedern des Clubs.">
        <Select name="clubId" defaultValue={machine?.clubId ?? ""}>
          <option value="">— Nur für mich —</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Foto"
        hint={machine?.id ? "Leer lassen, um das aktuelle Foto zu behalten." : undefined}
      >
        <Input name="foto" type="file" accept="image/*" />
      </Field>

      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
