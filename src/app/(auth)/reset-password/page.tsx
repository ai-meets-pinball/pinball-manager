"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { resetPassword } from "@/lib/auth-client";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  // Better Auth hängt bei einem kaputten Link ?error=INVALID_TOKEN an.
  const linkFehler = params.get("error");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Ungültiger oder abgelaufener Link. Fordere einen neuen an.");
      return;
    }
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const { error } = await resetPassword({
      newPassword: String(form.get("password")),
      token,
    });

    setLoading(false);
    if (error) {
      setError(error.message ?? "Zurücksetzen fehlgeschlagen");
      return;
    }
    router.push("/login");
  }

  if (linkFehler || !token) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        Der Link ist ungültig oder abgelaufen.{" "}
        <Link
          href="/forgot-password"
          className="text-[var(--color-primary)] underline"
        >
          Neuen Link anfordern
        </Link>
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Neues Passwort" hint="Mindestens 8 Zeichen.">
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
        {loading ? "Speichern…" : "Passwort speichern"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">Neues Passwort</h1>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
