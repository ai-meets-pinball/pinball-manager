"use client";

import { useActionState, type ReactNode } from "react";
import { FormFeedback } from "@/components/ui/form-feedback";
import type { FormState } from "@/db/actions/form-state";

/*
  Ein <form> für eine FormState-Action ohne eigene Client-Komponente drumherum.
  Server-Seiten (und Client-Listen) legen hidden inputs + ConfirmButton hinein;
  eine Ablehnung der Action erscheint als Zeile darunter statt als Fehlerseite.
  Ersetzt das Muster `<form action={voidAction}>`, bei dem ein `throw` in der
  Action direkt auf der Next-Fehlerseite landete.
*/
export function ActionForm({
  action,
  className,
  children,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  className?: string;
  children: ReactNode;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      <FormFeedback state={state} />
    </form>
  );
}
