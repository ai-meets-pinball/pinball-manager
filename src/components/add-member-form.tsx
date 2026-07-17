"use client";

import { Mail } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import type { FormState } from "@/db/actions/clubs";

export function AddMemberForm({
  action,
  clubId,
  allowOwner = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  clubId: string;
  allowOwner?: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="clubId" value={clubId} />
      <div className="flex-1">
        <Field
          label="E-Mail einladen"
          hint="Bestehende oder neue Adresse — neue Nutzer registrieren sich über den Link."
        >
          <Input name="email" type="email" required />
        </Field>
      </div>
      <Field label="Rolle">
        <Select name="rolle" defaultValue="member">
          <option value="member">Mitglied</option>
          <option value="admin">Admin</option>
          {allowOwner ? <option value="owner">Owner</option> : null}
        </Select>
      </Field>
      <Button type="submit" disabled={pending}>
        <Mail size={16} /> {pending ? "Senden…" : "Einladen"}
      </Button>
      {state.error ? (
        <p className="text-sm text-[var(--color-danger)] sm:basis-full">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-[var(--color-success)] sm:basis-full">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
