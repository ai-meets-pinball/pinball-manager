"use client";

import { useActionState, useState } from "react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Field, Input } from "@/components/ui/input";
import type { FormState } from "@/db/actions/form-state";

/*
  Umbenennen-Dialog für ein einzelnes Namensfeld — die eine Quelle für Plan
  (plan-header.tsx) und Generation (generation-row.tsx), die vorher zwei
  byte-gleiche Kopien trugen. Nur gemountet, solange offen (siehe ActionDialog):
  jede Öffnung startet mit frischem Formular- und Fehlerzustand.

  Speichern erst, wenn der getrimmte Name vom gespeicherten abweicht und nicht
  leer ist (P2). Ein Namenskonflikt kommt als `error` aus der Action zurück und
  bleibt im offenen Dialog stehen — samt der Eingabe (e2e/umbenennen.spec.ts
  prüft genau das gegen den React-19-Form-Reset).

  Die Props sind reine Daten; wer hier ein Prädikat oder einen Seiteneffekt
  braucht, hat einen anderen Dialog vor sich (vgl. den Rollen-Dialog, der aus
  genau dem Grund NICHT geteilt wurde).
*/
export function RenameDialog({
  action,
  titel,
  feldName,
  feldWert,
  name: gespeichert,
  maxLength,
  onClose,
}: {
  /** Server Action mit FormState-Vertrag (useActionState). */
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  titel: string;
  /** Name des hidden fields, das die Action als Kennung liest (planId, id …). */
  feldName: string;
  feldWert: string;
  /** Gespeicherter Name — Vorbelegung und Vergleichswert. */
  name: string;
  maxLength?: number;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );
  const [name, setName] = useState(gespeichert);
  const unveraendert = name.trim() === "" || name.trim() === gespeichert;

  return (
    <ActionDialog onClose={onClose} ok={Boolean(state.ok)}>
      <form action={formAction} className="space-y-4 p-5">
        <h3 className="text-base font-semibold">{titel}</h3>
        <input type="hidden" name={feldName} value={feldWert} />
        <Field label="Name">
          <Input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={maxLength}
            required
            autoFocus
          />
        </Field>
        <FormFeedback state={state} />
        <div className="flex justify-end gap-2">
          <DialogAbbrechen />
          <Button type="submit" size="sm" disabled={pending || unveraendert}>
            {pending ? "…" : "Speichern"}
          </Button>
        </div>
      </form>
    </ActionDialog>
  );
}
