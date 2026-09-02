"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { ICON_BTN } from "@/components/ui/icon-button";
import { Field, Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list";
import { deleteGeneration, renameGeneration } from "@/db/actions/generations";
import type { FormState } from "@/db/actions/form-state";
import { anzahl } from "@/lib/format";

/*
  Eine Generation als kompakte Listenzeile: Name als Titel, darunter die
  Modellzahl als LINK auf die gefilterte Modell-Liste (/admin/modelle?gen=…) —
  statt einer Klappe mit den Modellen (P3). Rechts Stift (Dialog „Generation
  umbenennen") und Papierkorb (ConfirmButton, nennt die Folge für die Modelle).
*/
export function GenerationRow({
  id,
  name,
  modelle,
  zeitraum,
}: {
  id: string;
  name: string;
  /** Anzahl zugeordneter Modelle. */
  modelle: number;
  /** z. B. „1979–1984" — leer, wenn keine Jahre bekannt sind. */
  zeitraum: string | null;
}) {
  const [umbenennen, setUmbenennen] = useState(false);
  const loeschFrage =
    `„${name}" löschen?` +
    (modelle === 0
      ? ""
      : modelle === 1
        ? " 1 Modell verliert seine Zuordnung."
        : ` ${modelle} Modelle verlieren ihre Zuordnung.`);

  return (
    <ListRow
      title={name}
      subtitle={
        <>
          <Link href={`/admin/modelle?gen=${id}`} className="hover:underline">
            {anzahl(modelle, "Modell", "Modelle")}
          </Link>
          {zeitraum ? <> · {zeitraum}</> : null}
        </>
      }
      actions={
        <>
          <button
            type="button"
            onClick={() => setUmbenennen(true)}
            aria-label={`${name} umbenennen`}
            title="Umbenennen"
            className={ICON_BTN}
          >
            <Pencil size={14} />
          </button>
          <ActionForm action={deleteGeneration} className="flex items-center gap-2">
            <input type="hidden" name="id" value={id} />
            <ConfirmButton
              question={loeschFrage}
              confirmLabel="Ja, löschen"
              aria-label={`${name} löschen`}
              title="Löschen"
              className={`${ICON_BTN} hover:text-[var(--color-danger)]`}
            >
              <Trash2 size={14} />
            </ConfirmButton>
          </ActionForm>
          {umbenennen ? (
            <UmbenennenDialog
              id={id}
              name={name}
              onClose={() => setUmbenennen(false)}
            />
          ) : null}
        </>
      }
    />
  );
}

/* Nur gemountet, solange offen (siehe ActionDialog). Speichern erst, wenn der
   getrimmte Name vom gespeicherten abweicht (P2); ein Namenskonflikt kommt als
   Fehler aus der Action zurück und bleibt im Dialog stehen. */
function UmbenennenDialog({
  id,
  name: gespeichert,
  onClose,
}: {
  id: string;
  name: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    renameGeneration,
    {},
  );
  const [name, setName] = useState(gespeichert);
  const unveraendert = name.trim() === "" || name.trim() === gespeichert;

  return (
    <ActionDialog onClose={onClose} ok={Boolean(state.ok)}>
      <form action={formAction} className="space-y-4 p-5">
        <h3 className="text-base font-semibold">Generation umbenennen</h3>
        <input type="hidden" name="id" value={id} />
        <Field label="Name">
          <Input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
