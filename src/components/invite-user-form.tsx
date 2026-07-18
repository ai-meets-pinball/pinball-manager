"use client";

import { Mail } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import type { FormState } from "@/db/actions/clubs";
import { invitePlatformUser } from "@/db/actions/invitations";

/** Plattform-Einladung im Admin-Bereich: berechtigt zur Registrierung (ohne Club). */
export function InviteUserForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    invitePlatformUser,
    {},
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <Field
          label="E-Mail einladen"
          hint="Die Person erhält einen Registrierungslink. Ohne Einladung ist keine Registrierung möglich."
        >
          <Input name="email" type="email" required />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        <Mail size={16} /> {pending ? "Senden…" : "Einladen"}
      </Button>
      {state.error ? (
        <p className="text-sm text-[var(--color-danger)] sm:basis-full">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-[var(--color-success)] sm:basis-full">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
