"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Field, Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { deleteAccount } from "@/db/actions/account";
import type { FormState } from "@/db/actions/form-state";

/*
  Konto-Löschung (DSGVO Art. 17). Zur Bestätigung muss die eigene E-Mail exakt
  eingetippt werden; der finale Klick läuft über das ConfirmButton-Modal. Bei
  Erfolg leitet die Server-Action auf „/" um (kein Client-Erfolgspfad nötig).
*/
export function DeleteAccountForm({ email }: { email: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    deleteAccount,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-sm text-[var(--color-muted)]">
        Löscht dein Konto und deine persönlichen Daten{" "}
        <strong>unwiderruflich</strong> — private Maschinen inkl. Fotos,
        Einstellungen und Feedback. In Clubs geteilte Inhalte bleiben dem Club
        erhalten. Bist du alleiniger Owner eines Clubs, übertrage die Ownerschaft
        vorher.
      </p>
      <Field label="Zur Bestätigung deine E-Mail-Adresse eingeben">
        <Input
          name="bestaetigung"
          type="email"
          autoComplete="off"
          placeholder={email}
          required
        />
      </Field>
      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}
      <ConfirmButton
        question="Konto und persönliche Daten wirklich unwiderruflich löschen?"
        confirmLabel="Ja, Konto löschen"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-danger)] hover:underline"
      >
        <Trash2 size={14} /> Konto löschen
      </ConfirmButton>
    </form>
  );
}
