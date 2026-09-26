"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { ICON_BTN } from "@/components/ui/icon-button";
import { Field, Input, Select } from "@/components/ui/input";
import { deleteBesitzer, updateBesitzer } from "@/db/actions/besitzer";
import type { FormState } from "@/db/actions/form-state";
import { BESITZER_NAME_MAX, besitzerLoeschenGesperrt } from "@/lib/besitzer";

/*
  Zeilen-Aktionen je Besitzer-Eintrag auf der Club-Seite — dasselbe Muster wie
  die Mitglieder (member-actions.tsx): Stift öffnet den Dialog (Name, Konto,
  Zusammenführen), Papierkorb löscht; mit Maschinen ist er ausgegraut und
  nennt im Tooltip den Grund (lib/besitzer.ts).
*/
export function BesitzerActions({
  clubId,
  besitzer,
  mitglieder,
  andere,
}: {
  clubId: string;
  besitzer: { id: string; name: string; userId: string | null; maschinen: number };
  /** Club-Mitglieder zum Verknüpfen. */
  mitglieder: { userId: string; name: string }[];
  /** Die anderen Einträge des Clubs zum Zusammenführen. */
  andere: { id: string; name: string }[];
}) {
  const [dialog, setDialog] = useState(false);
  const sperre = besitzerLoeschenGesperrt(besitzer.maschinen);

  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setDialog(true)}
        aria-label={`Besitzer ${besitzer.name} bearbeiten`}
        title="Bearbeiten"
        className={ICON_BTN}
      >
        <Pencil size={14} />
      </button>
      <form action={deleteBesitzer}>
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="besitzerId" value={besitzer.id} />
        <ConfirmButton
          question={`„${besitzer.name}“ aus dem Besitzer-Katalog löschen?`}
          confirmLabel="Ja, löschen"
          aria-label={`Besitzer ${besitzer.name} löschen`}
          title={sperre ?? "Löschen"}
          disabled={sperre !== null}
          className={`${ICON_BTN} hover:text-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <Trash2 size={14} />
        </ConfirmButton>
      </form>
      {dialog ? (
        <BesitzerDialog
          clubId={clubId}
          besitzer={besitzer}
          mitglieder={mitglieder}
          andere={andere}
          onClose={() => setDialog(false)}
        />
      ) : null}
    </span>
  );
}

function BesitzerDialog({
  clubId,
  besitzer,
  mitglieder,
  andere,
  onClose,
}: {
  clubId: string;
  besitzer: { id: string; name: string; userId: string | null };
  mitglieder: { userId: string; name: string }[];
  andere: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateBesitzer,
    {},
  );
  const [ziel, setZiel] = useState("");

  return (
    <ActionDialog onClose={onClose} ok={Boolean(state.ok)}>
      <form action={formAction} className="space-y-4 p-5">
        <h3 className="text-base font-semibold">Besitzer bearbeiten</h3>
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="besitzerId" value={besitzer.id} />

        <Field label="Name">
          <Input
            name="name"
            defaultValue={besitzer.name}
            maxLength={BESITZER_NAME_MAX}
            required={!ziel}
            disabled={Boolean(ziel)}
          />
        </Field>
        <Field
          label="Konto"
          hint="Verknüpft den Eintrag mit einem Mitglied — der Name folgt dann dem Konto."
        >
          <Select name="userId" defaultValue={besitzer.userId ?? ""} disabled={Boolean(ziel)}>
            <option value="">— kein Konto —</option>
            {mitglieder.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        {andere.length > 0 ? (
          <Field
            label="Zusammenführen mit"
            hint="Die Maschinen dieses Eintrags wandern zum gewählten Eintrag, dieser hier wird gelöscht."
          >
            <Select
              name="zusammenfuehrenMit"
              value={ziel}
              onChange={(e) => setZiel(e.target.value)}
            >
              <option value="">— nicht zusammenführen —</option>
              {andere.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <FormFeedback state={state} />

        <div className="flex justify-end gap-2">
          <DialogAbbrechen />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Speichern…" : ziel ? "Zusammenführen" : "Speichern"}
          </Button>
        </div>
      </form>
    </ActionDialog>
  );
}
