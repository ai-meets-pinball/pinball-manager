"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const { error } = await requestPasswordReset({
      email: String(form.get("email")),
      redirectTo: "/reset-password",
    });

    setLoading(false);
    if (error) {
      setError(error.message ?? "Anfrage fehlgeschlagen");
      return;
    }
    // Bewusst immer Erfolg zeigen — verrät nicht, ob die E-Mail existiert.
    setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">Passwort vergessen</h1>

      {sent ? (
        <p className="text-sm text-[var(--color-muted)]">
          Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Link
          zum Zurücksetzen geschickt. Prüfe dein Postfach.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-[var(--color-muted)]">
            Gib deine E-Mail ein — wir schicken dir einen Link zum Zurücksetzen.
          </p>
          <Field label="E-Mail">
            <Input name="email" type="email" required autoComplete="email" />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={loading}>
            {loading ? "Senden…" : "Link senden"}
          </Button>
        </form>
      )}

      <p className="text-sm text-[var(--color-muted)]">
        <Link href="/login" className="text-[var(--color-primary)] underline">
          Zurück zur Anmeldung
        </Link>
      </p>
    </main>
  );
}
