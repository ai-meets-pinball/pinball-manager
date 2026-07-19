"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import type { FormState } from "@/db/actions/clubs";
import { registerAccount } from "@/db/actions/register";
import { PASSWORD_HINT } from "@/lib/validators";

/*
  Registrierung läuft über die Server Action registerAccount(), nicht über
  signUp.email() im Client: nur so kann der Einladungs-TOKEN geprüft werden,
  bevor ein Konto entsteht. Ohne gültigen Token (oder leere Installation)
  lehnt der Auth-Hook den Sign-up ohnehin ab.
*/
function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const invite = params.get("invite");

  const [state, formAction, pending] = useActionState<FormState, FormData>(
    registerAccount,
    {},
  );

  // Nach erfolgreicher Registrierung ist die Session gesetzt → weiterleiten.
  useEffect(() => {
    if (state.message) {
      router.push("/machines");
      router.refresh();
    }
  }, [state.message, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {invite ? <input type="hidden" name="invite" value={invite} /> : null}

      {!invite ? (
        <p className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-muted)]">
          Ein Konto lässt sich nur mit Einladung anlegen. Nutze bitte den Link
          aus deiner Einladungs-E-Mail.
        </p>
      ) : null}

      <Field label="Name">
        <Input name="name" required autoComplete="name" />
      </Field>
      <Field label="E-Mail">
        <Input name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Passwort" hint={PASSWORD_HINT}>
        <PasswordField name="password" required autoComplete="new-password" />
      </Field>
      <Field label="Passwort wiederholen">
        <PasswordField
          name="passwordConfirm"
          required
          autoComplete="new-password"
        />
      </Field>

      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Konto wird erstellt…" : "Registrieren"}
      </Button>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">Konto erstellen</h1>
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
      <p className="text-sm text-[var(--color-muted)]">
        Schon ein Konto?{" "}
        <Link href="/login" className="text-[var(--color-accent)] underline">
          Anmelden
        </Link>
      </p>
    </main>
  );
}
