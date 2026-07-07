"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import type { FormState } from "@/db/actions/clubs";

export function ClubForm({
  action,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <Field label="Club-Name">
        <Input name="name" required />
      </Field>
      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Erstellen…" : "Club erstellen"}
      </Button>
    </form>
  );
}
