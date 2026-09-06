"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useActionState, useEffect } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import type { FormState } from "@/db/actions/form-state";
import { registerAccount } from "@/db/actions/register";
import { PASSWORD_HINT } from "@/lib/validators";

/*
  Registrierung läuft über die Server Action registerAccount(), nicht über
  signUp.email() im Client: nur so kann ein Einladungs-TOKEN geprüft werden,
  bevor ein Konto entsteht. Ohne Einladung ist das Sign-up offen — angemeldet
  wird dann erst nach dem Klick auf den Bestätigungslink (`message`); mit
  Einladung sofort (`ok`).
*/
function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const invite = params.get("invite");

  const [state, formAction, pending] = useActionState<FormState, FormData>(
    registerAccount,
    {},
  );

  // Eingeladene sind nach dem Sign-up angemeldet → direkt in die App.
  useEffect(() => {
    if (state.ok) {
      router.push("/machines");
      router.refresh();
    }
  }, [state.ok, router]);

  if (state.message) {
    return (
      <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
        <MailCheck size={22} className="text-[var(--color-accent)]" />
        <p className="text-sm">{state.message}</p>
        <p className="text-xs text-[var(--color-muted)]">
          Keine Mail bekommen? Prüfe den Spam-Ordner. Der Link ist eine Stunde
          gültig — danach schickt dir ein Anmeldeversuch automatisch einen neuen.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {invite ? <input type="hidden" name="invite" value={invite} /> : null}

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

      <p className="text-xs text-[var(--color-muted)]">
        {invite
          ? "Deine Einladung bestätigt die Adresse — du bist danach direkt angemeldet. "
          : "Du bekommst einen Bestätigungslink per E-Mail. "}
        Mit der Registrierung akzeptierst du die{" "}
        <Link href="/datenschutz" className="text-[var(--color-accent)] underline">
          Datenschutzerklärung
        </Link>
        .
      </p>
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
