"use client";

import { UserPlus } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import type { FormState } from "@/db/actions/clubs";

export function AddMemberForm({
  action,
  clubId,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  clubId: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="clubId" value={clubId} />
      <div className="flex-1">
        <Field label="E-Mail des Mitglieds">
          <Input name="email" type="email" required />
        </Field>
      </div>
      <Field label="Rolle">
        <Select name="rolle" defaultValue="member">
          <option value="member">Mitglied</option>
          <option value="admin">Admin</option>
        </Select>
      </Field>
      <Button type="submit" disabled={pending}>
        <UserPlus size={16} /> {pending ? "Hinzufügen…" : "Hinzufügen"}
      </Button>
      {state.error ? (
        <p className="text-sm text-[var(--color-danger)] sm:basis-full">{state.error}</p>
      ) : null}
    </form>
  );
}
