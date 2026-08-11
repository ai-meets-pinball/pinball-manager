"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import { signIn } from "@/lib/auth-client";

/* useSearchParams braucht in Next eine Suspense-Grenze — daher der Wrapper. */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  // Rücksprungziel (z. B. von der QR-Melde-Seite): nur RELATIVE Pfade zulassen
  // — sonst wäre das ein Open-Redirect auf fremde Seiten.
  const von = useSearchParams().get("von");
  const ziel =
    von && von.startsWith("/") && !von.startsWith("//") ? von : "/machines";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const { error } = await signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    setLoading(false);
    if (error) {
      setError(error.message ?? "Anmeldung fehlgeschlagen");
      return;
    }
    router.push(ziel);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">Anmelden</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="E-Mail">
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Passwort">
          <PasswordField
            name="password"
            required
            autoComplete="current-password"
          />
        </Field>
        {error ? (
          <p className="text-sm text-[var(--color-danger)]">{error}</p>
        ) : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Anmelden…" : "Anmelden"}
        </Button>
      </form>
      <p className="text-sm text-[var(--color-muted)]">
        <Link
          href="/forgot-password"
          className="text-[var(--color-accent)] underline"
        >
          Passwort vergessen?
        </Link>
      </p>
      <p className="text-sm text-[var(--color-muted)]">
        Kein Konto?{" "}
        <Link href="/register" className="text-[var(--color-accent)] underline">
          Jetzt registrieren
        </Link>
      </p>
    </main>
  );
}
