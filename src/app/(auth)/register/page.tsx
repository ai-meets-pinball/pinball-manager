"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const { error } = await signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    setLoading(false);
    if (error) {
      setError(error.message ?? "Registrierung fehlgeschlagen");
      return;
    }
    router.push("/machines");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">Registrieren</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Name">
          <Input name="name" type="text" required autoComplete="name" />
        </Field>
        <Field label="E-Mail">
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Passwort" hint="Mindestens 8 Zeichen.">
          <Input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>
        {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Registrieren…" : "Konto erstellen"}
        </Button>
      </form>
      <p className="text-sm text-[var(--color-muted)]">
        Bereits ein Konto?{" "}
        <Link href="/login" className="text-[var(--color-primary)] underline">
          Anmelden
        </Link>
      </p>
    </main>
  );
}
