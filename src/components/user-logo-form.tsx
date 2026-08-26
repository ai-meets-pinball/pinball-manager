"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { FormFeedback } from "@/components/ui/form-feedback";
import { setUserLogo } from "@/db/actions/settings";
import type { FormState } from "@/db/actions/form-state";

/* Persönliches Logo hochladen/ersetzen/entfernen (Einzelperson) — für die
   QR-Etiketten der eigenen (privaten) Sammlung und Maschinen. Klon von
   ClubLogoForm, nur ohne clubId. */
export function UserLogoForm({ hatLogo }: { hatLogo: boolean }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    setUserLogo,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <Field
        label={hatLogo ? "Logo ersetzen" : "Logo hochladen"}
        hint="JPG, PNG oder SVG."
      >
        {/* Ohne required: der „Logo entfernen"-Submit teilt sich das Formular. */}
        <Input
          name="logo"
          type="file"
          accept=".jpg,.jpeg,.png,.svg,image/jpeg,image/png,image/svg+xml"
        />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : null}
          {pending ? "Speichere…" : "Speichern"}
        </Button>
        {hatLogo ? (
          <Button
            type="submit"
            variant="secondary"
            name="entfernen"
            value="true"
            disabled={pending}
          >
            Logo entfernen
          </Button>
        ) : null}
      </div>
      <FormFeedback state={state} />
    </form>
  );
}
