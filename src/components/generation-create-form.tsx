"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Field, Input } from "@/components/ui/input";
import { createGeneration } from "@/db/actions/generations";
import type { FormState } from "@/db/actions/form-state";

/*
  „Neue Generation" (Super-Admin): Button neben der Überschrift, das Formular im
  Dialog (P4 — Neu/Ändern im <dialog>, keine Klappe vor der Liste). Fehler wie
  ein bereits vergebener Name (unique) bleiben im Dialog sichtbar; Erfolg
  (`ok`) schließt ihn, die neue Zeile kommt über die Revalidierung.
*/
export function GenerationAnlegen() {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOffen(true)}>
        <Plus size={14} /> Neue Generation
      </Button>
      {offen ? <AnlegenDialog onClose={() => setOffen(false)} /> : null}
    </>
  );
}

function AnlegenDialog({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createGeneration,
    {},
  );
  const [name, setName] = useState("");

  return (
    <ActionDialog onClose={onClose} ok={Boolean(state.ok)}>
      <form action={formAction} className="space-y-4 p-5">
        <h3 className="text-base font-semibold">Neue Generation</h3>
        <Field label="Name">
          <Input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. WPC-95"
            autoFocus
          />
        </Field>
        <FormFeedback state={state} />
        <div className="flex justify-end gap-2">
          <DialogAbbrechen />
          <Button
            type="submit"
            size="sm"
            disabled={pending || name.trim() === ""}
          >
            {pending ? "…" : "Anlegen"}
          </Button>
        </div>
      </form>
    </ActionDialog>
  );
}
