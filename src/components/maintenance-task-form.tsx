"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { FormState } from "@/db/actions/maintenance";

type TaskValues = {
  id: string;
  titel: string;
  kategorie: string | null;
  bauteil: string | null;
  taetigkeit: string | null;
  beschreibung: string | null;
  prioritaet: string;
  intervallTyp: string;
  intervallTage: number | null;
  intervallText: string | null;
};

export function MaintenanceTaskForm({
  action,
  machineId,
  task,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  machineId: string;
  task?: TaskValues;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );
  // Intervall-Typ steuert, ob das Feld »Intervall (Tage)« sinnvoll ist.
  const [intervallTyp, setIntervallTyp] = useState(task?.intervallTyp ?? "bedarf");

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <input type="hidden" name="machineId" value={machineId} />
      {task ? <input type="hidden" name="id" value={task.id} /> : null}

      <Field label="Wartungspunkt">
        <Input name="titel" required defaultValue={task?.titel ?? ""} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Kategorie">
          <Input name="kategorie" defaultValue={task?.kategorie ?? ""} />
        </Field>
        <Field label="Bauteil">
          <Input name="bauteil" defaultValue={task?.bauteil ?? ""} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Tätigkeit">
          <Input
            name="taetigkeit"
            placeholder="Prüfen, Reinigen, Ersetzen …"
            defaultValue={task?.taetigkeit ?? ""}
          />
        </Field>
        <Field label="Priorität">
          <Select name="prioritaet" defaultValue={task?.prioritaet ?? "mittel"}>
            <option value="niedrig">niedrig</option>
            <option value="mittel">mittel</option>
            <option value="hoch">hoch</option>
            <option value="sehr hoch">sehr hoch</option>
            <option value="kritisch">kritisch</option>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Intervall-Typ"
          hint="Nur »zeit« ergibt einen Fälligkeitstermin."
        >
          <Select
            name="intervallTyp"
            value={intervallTyp}
            onChange={(e) => setIntervallTyp(e.target.value)}
          >
            <option value="zeit">zeit (Termin)</option>
            <option value="spiele">spiele (Checkliste)</option>
            <option value="bedarf">bei Bedarf (Checkliste)</option>
          </Select>
        </Field>
        <Field label="Intervall (Tage)">
          <Input
            name="intervallTage"
            type="number"
            min="1"
            placeholder={intervallTyp === "zeit" ? "z. B. 30" : "— nur bei »zeit«"}
            defaultValue={task?.intervallTage ?? ""}
            disabled={intervallTyp !== "zeit"}
          />
        </Field>
      </div>

      <Field
        label="Intervall-Notiz (optional)"
        hint="Freies Label, z. B. »500 Spiele / monatlich«."
      >
        <Input name="intervallText" defaultValue={task?.intervallText ?? ""} />
      </Field>

      <Field label="Beschreibung">
        <Textarea name="beschreibung" defaultValue={task?.beschreibung ?? ""} />
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
