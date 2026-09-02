"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { ICON_BTN } from "@/components/ui/icon-button";
import { Field, Input } from "@/components/ui/input";
import { deletePlan, renamePlan } from "@/db/actions/maintenance-plans";
import type { FormState } from "@/db/actions/form-state";

/*
  Kopf eines Plans (nur für Manager): Name als Titel, daneben Stift (Umbenennen
  im Dialog) und Papierkorb (ConfirmButton) als Icon-Aktionen; rechts der Slot
  für „Punkt hinzufügen" (kommt von der Seite). Vorher tauschte der Stift den
  Titel gegen ein Inline-Eingabefeld — das dritte Bearbeiten-Muster auf einer
  Seite. Löschen entkoppelt verknüpfte Maschinen (ihre Punkte werden eigene
  Kopien).
*/
export function PlanHeader({
  planId,
  name,
  children,
}: {
  planId: string;
  name: string;
  /** Aktionen rechts (z. B. „Punkt hinzufügen"). */
  children?: ReactNode;
}) {
  const [umbenennen, setUmbenennen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-lg font-semibold">{name}</h2>
      <button
        type="button"
        onClick={() => setUmbenennen(true)}
        aria-label="Plan umbenennen"
        title="Umbenennen"
        className={ICON_BTN}
      >
        <Pencil size={14} />
      </button>
      <ActionForm action={deletePlan}>
        <input type="hidden" name="planId" value={planId} />
        <ConfirmButton
          question="Plan löschen? Verknüpfte Maschinen werden entkoppelt — ihre Punkte werden eigene, editierbare Kopien; die Historie bleibt."
          confirmLabel="Ja, löschen"
          aria-label="Plan löschen"
          title="Plan löschen"
          className={`${ICON_BTN} hover:text-[var(--color-danger)]`}
        >
          <Trash2 size={14} />
        </ConfirmButton>
      </ActionForm>
      {children ? (
        <div className="ml-auto flex items-center gap-2">{children}</div>
      ) : null}
      {umbenennen ? (
        <UmbenennenDialog
          planId={planId}
          name={name}
          onClose={() => setUmbenennen(false)}
        />
      ) : null}
    </div>
  );
}

/* Speichern erst, wenn der Name sich unterscheidet (und nicht leer ist). */
function UmbenennenDialog({
  planId,
  name,
  onClose,
}: {
  planId: string;
  name: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    renamePlan,
    {},
  );
  const [wert, setWert] = useState(name);
  const unveraendert = wert.trim() === "" || wert.trim() === name;

  return (
    <ActionDialog onClose={onClose} ok={Boolean(state.ok)}>
      <form action={formAction} className="space-y-4 p-5">
        <h3 className="text-base font-semibold">Plan umbenennen</h3>
        <input type="hidden" name="planId" value={planId} />
        <Field label="Name">
          <Input
            name="name"
            value={wert}
            onChange={(e) => setWert(e.target.value)}
            maxLength={80}
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
