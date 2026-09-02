"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { Button, buttonStyles } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Field, Input } from "@/components/ui/input";
import { deleteAccount } from "@/db/actions/account";
import type { FormState } from "@/db/actions/form-state";

/*
  Konto-Löschung (DSGVO Art. 17): ein roter Knopf öffnet den Dialog; darin muss
  die eigene E-Mail exakt eingetippt werden, der finale Klick läuft zusätzlich
  über das ConfirmButton-Modal. Bei Erfolg leitet die Server-Action auf „/" um
  (kein Client-Erfolgspfad nötig); eine Ablehnung steht als Zeile im Dialog.
*/
export function KontoLoeschen({ email }: { email: string }) {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <Button type="button" variant="danger" size="sm" onClick={() => setOffen(true)}>
        <Trash2 size={14} /> Konto löschen
      </Button>
      {offen ? <LoeschDialog email={email} onClose={() => setOffen(false)} /> : null}
    </>
  );
}

function LoeschDialog({ email, onClose }: { email: string; onClose: () => void }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    deleteAccount,
    {},
  );
  const [eingabe, setEingabe] = useState("");
  const bestaetigt = eingabe.trim().toLowerCase() === email.toLowerCase();

  return (
    <ActionDialog onClose={onClose}>
      <form action={formAction} className="space-y-4 p-5">
        <h3 className="text-base font-semibold text-[var(--color-danger)]">
          Konto unwiderruflich löschen
        </h3>
        <p className="text-sm text-[var(--color-muted)]">
          Löscht dein Konto und deine persönlichen Daten{" "}
          <strong>unwiderruflich</strong> — private Maschinen inkl. Fotos,
          Einstellungen und Feedback. In Clubs geteilte Inhalte bleiben dem Club
          erhalten. Bist du alleiniger Owner eines Clubs, übertrage die
          Ownerschaft vorher.
        </p>
        <Field label="Zur Bestätigung deine E-Mail-Adresse eingeben">
          <Input
            name="bestaetigung"
            type="email"
            autoComplete="off"
            placeholder={email}
            value={eingabe}
            onChange={(e) => setEingabe(e.target.value)}
            required
          />
        </Field>
        <FormFeedback state={state} />
        <div className="flex justify-end gap-2">
          <DialogAbbrechen />
          <ConfirmButton
            question="Konto und persönliche Daten wirklich unwiderruflich löschen?"
            confirmLabel="Ja, Konto löschen"
            disabled={!bestaetigt}
            title={bestaetigt ? undefined : "Erst die E-Mail-Adresse zur Bestätigung eingeben"}
            className={buttonStyles({ variant: "danger", size: "sm" })}
          >
            <Trash2 size={14} /> Konto löschen
          </ConfirmButton>
        </div>
      </form>
    </ActionDialog>
  );
}
