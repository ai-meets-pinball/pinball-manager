"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import type { FormState } from "@/db/actions/form-state";
import { saveWhatsappNummer } from "@/db/actions/whatsapp";

/*
  Globale WhatsApp-Nummer im Profil. Das eigentliche Opt-in erfolgt PRO CLUB
  (Schalter je Club auf der Account-Seite); ohne Nummer geht auch mit aktiviertem
  Club-Schalter nichts raus.
*/
export function WhatsappSettingsForm({ nummer }: { nummer: string | null }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveWhatsappNummer,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <Field
        label="WhatsApp-Nummer"
        hint="Internationale Vorwahl, z. B. +49151… — leer lassen entfernt die Nummer."
      >
        <Input
          type="tel"
          name="nummer"
          defaultValue={nummer ?? ""}
          placeholder="+49151…"
          autoComplete="tel"
        />
      </Field>

      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-[var(--color-success)]">{state.message}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        <Save size={16} /> {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
