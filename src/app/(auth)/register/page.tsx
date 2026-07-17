"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import { acceptInvitationAction } from "@/db/actions/invitations";
import { signUp } from "@/lib/auth-client";
import { PASSWORD_HINT, validatePassword } from "@/lib/validators";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const invite = params.get("invite");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name"));
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const confirm = String(form.get("passwordConfirm"));

    const policy = validatePassword(password);
    if (policy) {
      setError(policy);
      return;
    }
    if (password !== confirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    const { error } = await signUp.email({ name, email, password });
    if (error) {
      setLoading(false);
      setError(error.message ?? "Registrierung fehlgeschlagen");
      return;
    }

    // Bei Registrierung über einen Einladungslink direkt beitreten.
    if (invite) {
      const res = await acceptInvitationAction(invite);
      setLoading(false);
      router.push(res.clubId ? `/clubs/${res.clubId}` : "/machines");
      router.refresh();
      return;
    }

    setLoading(false);
    router.push("/machines");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
      {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Konto wird erstellt…" : "Registrieren"}
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
