"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
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
    router.push("/machines");
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
          <Input
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </Field>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Anmelden…" : "Anmelden"}
        </Button>
      </form>
      <p className="text-sm text-[var(--color-muted)]">
        <Link
          href="/forgot-password"
          className="text-[var(--color-primary)] underline"
        >
          Passwort vergessen?
        </Link>
      </p>
      <p className="text-sm text-[var(--color-muted)]">
        Noch kein Konto?{" "}
        <Link href="/register" className="text-[var(--color-primary)] underline">
          Registrieren
        </Link>
      </p>
    </main>
  );
}
