"use client";

import { Mail, Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ROLE_LABEL } from "@/components/ui/status-badge";
import { inviteMember } from "@/db/actions/invitations";
import type { FormState } from "@/db/actions/form-state";
import { CLUB_ROLES } from "@/lib/validators";

/*
  „Mitglied einladen" — Button neben der Überschrift, das Formular im Dialog
  (Prinzip: Neu im Dialog). Die Rollen kommen aus CLUB_ROLES/ROLE_LABEL statt
  hart kodiert; Owner steht nur Ownern zur Wahl (die Action prüft dasselbe).
  Erfolg meldet die Action als `message` — der Dialog schließt, und die neue
  Einladung erscheint unter „Offene Einladungen".
*/
export function MitgliedEinladen({
  clubId,
  allowOwner = false,
}: {
  clubId: string;
  allowOwner?: boolean;
}) {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOffen(true)}>
        <Plus size={14} /> Mitglied einladen
      </Button>
      {offen ? (
        <EinladenDialog
          clubId={clubId}
          allowOwner={allowOwner}
          onClose={() => setOffen(false)}
        />
      ) : null}
    </>
  );
}

function EinladenDialog({
  clubId,
  allowOwner,
  onClose,
}: {
  clubId: string;
  allowOwner: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    inviteMember,
    {},
  );
  const rollen = allowOwner ? [...CLUB_ROLES] : CLUB_ROLES.filter((r) => r !== "owner");

  return (
    <ActionDialog onClose={onClose} ok={Boolean(state.ok || state.message)}>
      <form action={formAction} className="space-y-4 p-5">
        <h3 className="text-base font-semibold">Mitglied einladen</h3>
        <input type="hidden" name="clubId" value={clubId} />
        <Field
          label="E-Mail"
          hint="Bestehende oder neue Adresse — neue Nutzer registrieren sich über den Link."
        >
          <Input name="email" type="email" required autoFocus />
        </Field>
        <Field label="Rolle">
          <Select name="rolle" defaultValue="member">
            {rollen.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r] ?? r}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Persönliche Nachricht (optional)"
          hint="Wird in der Einladungsmail als zitierter Absatz ergänzt."
        >
          <Textarea name="message" rows={3} />
        </Field>

        <FormFeedback state={state} />

        <div className="flex justify-end gap-2">
          <DialogAbbrechen />
          <Button type="submit" size="sm" disabled={pending}>
            <Mail size={14} /> {pending ? "Senden…" : "Einladen"}
          </Button>
        </div>
      </form>
    </ActionDialog>
  );
}
