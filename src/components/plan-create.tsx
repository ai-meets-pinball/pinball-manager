"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { FormFeedback } from "@/components/ui/form-feedback";
import { createPlan } from "@/db/actions/maintenance-plans";
import type { FormState } from "@/db/actions/form-state";

/*
  Neuen benannten Wartungsplan anlegen — privat oder für einen Club, den ich
  manage. „aus Standard-Vorlage" befüllt den Plan mit dem Code-Template.
*/
export function PlanCreate({
  clubs,
}: {
  /** Clubs, für die ich einen Plan anlegen darf (Manager). */
  clubs: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createPlan,
    {},
  );

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3"
    >
      <Field label="Neuer Plan">
        <Input name="name" placeholder="z. B. Monatlich" required maxLength={80} />
      </Field>
      {clubs.length > 0 ? (
        <Field label="Für">
          <Select name="clubId" defaultValue="">
            <option value="">Mich (privat)</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <label className="flex items-center gap-2 py-2 text-sm text-[var(--color-muted)]">
        <input
          type="checkbox"
          name="ausVorlage"
          className="accent-[var(--color-accent)]"
        />
        aus Standard-Vorlage
      </label>
      <Button type="submit" variant="secondary" disabled={pending}>
        <Plus size={15} /> {pending ? "…" : "Anlegen"}
      </Button>
      <FormFeedback state={state} />
    </form>
  );
}
