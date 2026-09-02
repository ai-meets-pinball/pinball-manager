"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { FormFeedback } from "@/components/ui/form-feedback";
import { createPlan } from "@/db/actions/maintenance-plans";
import type { FormState } from "@/db/actions/form-state";

/*
  Neuen benannten Wartungsplan anlegen — privat oder für einen Club, den ich
  manage. „aus Standard-Vorlage" befüllt den Plan mit dem Code-Template.
  Button im Seitenkopf, Formular im Dialog (statt der früheren Klappe vor dem
  Inhalt); Erfolg schließt, der neue Plan erscheint als Reiter.
*/
export function PlanCreate({
  clubs,
}: {
  /** Clubs, für die ich einen Plan anlegen darf (Manager). */
  clubs: { id: string; name: string }[];
}) {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOffen(true)}>
        <Plus size={15} /> Neuer Plan
      </Button>
      {offen ? <PlanDialog clubs={clubs} onClose={() => setOffen(false)} /> : null}
    </>
  );
}

/* Nur gemountet, solange offen (siehe ActionDialog). Anlegen erst, wenn ein
   Name da ist — statt eines dauerhaft aktiven Buttons, der mit „Name fehlt"
   antwortet. */
function PlanDialog({
  clubs,
  onClose,
}: {
  clubs: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createPlan,
    {},
  );
  const [name, setName] = useState("");

  return (
    <ActionDialog onClose={onClose} ok={Boolean(state.ok)}>
      <form action={formAction} className="space-y-4 p-5">
        <h3 className="text-base font-semibold">Neuer Plan</h3>
        <Field label="Name">
          <Input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Monatlich"
            required
            maxLength={80}
            autoFocus
          />
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="ausVorlage"
            className="accent-[var(--color-accent)]"
          />
          aus Standard-Vorlage (20 bewährte Punkte)
        </label>
        <FormFeedback state={state} />
        <div className="flex justify-end gap-2">
          <DialogAbbrechen />
          <Button type="submit" size="sm" disabled={pending || name.trim() === ""}>
            {pending ? "…" : "Anlegen"}
          </Button>
        </div>
      </form>
    </ActionDialog>
  );
}
