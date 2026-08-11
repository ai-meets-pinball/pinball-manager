"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { FormFeedback } from "@/components/ui/form-feedback";
import { setClubLogo } from "@/db/actions/clubs";
import type { FormState } from "@/db/actions/form-state";

/* Vereins-Logo hochladen/ersetzen/entfernen — nur für Club-Owner/-Admins. */
export function ClubLogoForm({
  clubId,
  hatLogo,
}: {
  clubId: string;
  hatLogo: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    setClubLogo,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="clubId" value={clubId} />
      <Field
        label={hatLogo ? "Logo ersetzen" : "Logo hochladen"}
        hint="JPG, PNG oder SVG."
      >
        {/* Bewusst ohne required: der „Logo entfernen"-Submit teilt sich das
            Formular; die „Datei fehlt"-Meldung kommt vom Server. */}
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
