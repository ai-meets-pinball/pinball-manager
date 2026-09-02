"use client";

import { useActionState, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input } from "@/components/ui/input";
import { FormFeedback } from "@/components/ui/form-feedback";
import { setUserLogo } from "@/db/actions/settings";
import type { FormState } from "@/db/actions/form-state";

/* Persönliches Logo hochladen/ersetzen/entfernen (Einzelperson) — für die
   QR-Etiketten der eigenen (privaten) Sammlung und Maschinen. Klon von
   ClubLogoForm, nur ohne clubId: Speichern erst mit Datei, „Entfernen" als
   eigenes Formular mit derselben Action (siehe dort). */
export function UserLogoForm({ hatLogo }: { hatLogo: boolean }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    setUserLogo,
    {},
  );
  const [dateiGewaehlt, setDateiGewaehlt] = useState(false);

  return (
    <div className="space-y-2">
      <form action={formAction} className="space-y-2">
        <Field
          label={hatLogo ? "Logo ersetzen" : "Logo hochladen"}
          hint="JPG, PNG oder SVG."
        >
          <Input
            name="logo"
            type="file"
            accept=".jpg,.jpeg,.png,.svg,image/jpeg,image/png,image/svg+xml"
            onChange={(e) => setDateiGewaehlt((e.target.files?.length ?? 0) > 0)}
          />
        </Field>
        <Button
          type="submit"
          disabled={pending || !dateiGewaehlt}
          title={dateiGewaehlt ? undefined : "Erst eine Datei wählen"}
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : null}
          {pending ? "Speichere…" : "Speichern"}
        </Button>
      </form>
      {hatLogo ? (
        <form action={formAction}>
          <input type="hidden" name="entfernen" value="true" />
          <ConfirmButton
            question="Logo entfernen? Es verschwindet auch von deinen QR-Etiketten."
            confirmLabel="Ja, entfernen"
            disabled={pending}
          >
            <Trash2 size={13} /> Logo entfernen
          </ConfirmButton>
        </form>
      ) : null}
      <FormFeedback state={state} />
    </div>
  );
}
