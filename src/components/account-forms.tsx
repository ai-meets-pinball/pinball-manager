"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import { changePassword, updateUser } from "@/lib/auth-client";
import { PASSWORD_HINT, validatePassword } from "@/lib/validators";

/** Name ändern (Better Auth updateUser). */
export function ProfileForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMsg(null);
    setError(null);
    const name = String(new FormData(event.currentTarget).get("name")).trim();
    if (!name) {
      setError("Name ist erforderlich.");
      return;
    }
    setLoading(true);
    const { error } = await updateUser({ name });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Speichern fehlgeschlagen");
      return;
    }
    setMsg("Name gespeichert.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Name">
        <Input name="name" defaultValue={initialName} required />
      </Field>
      {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
      {msg ? <p className="text-sm text-[var(--color-success)]">{msg}</p> : null}
      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Speichern…" : "Name speichern"}
        </Button>
      </div>
    </form>
  );
}

/** Passwort ändern (aktuell + neu + Wiederholung). */
export function ChangePasswordForm() {
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMsg(null);
    setError(null);

    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword"));
    const newPassword = String(form.get("newPassword"));
    const confirm = String(form.get("newPasswordConfirm"));

    const policy = validatePassword(newPassword);
    if (policy) {
      setError(policy);
      return;
    }
    if (newPassword !== confirm) {
      setError("Die neuen Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    const { error } = await changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Passwortänderung fehlgeschlagen");
      return;
    }
    setMsg("Passwort geändert.");
    (event.target as HTMLFormElement).reset();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Aktuelles Passwort">
        <PasswordField
          name="currentPassword"
          required
          autoComplete="current-password"
        />
      </Field>
      <Field label="Neues Passwort" hint={PASSWORD_HINT}>
        <PasswordField name="newPassword" required autoComplete="new-password" />
      </Field>
      <Field label="Neues Passwort wiederholen">
        <PasswordField
          name="newPasswordConfirm"
          required
          autoComplete="new-password"
        />
      </Field>
      {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
      {msg ? <p className="text-sm text-[var(--color-success)]">{msg}</p> : null}
      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Ändern…" : "Passwort ändern"}
        </Button>
      </div>
    </form>
  );
}
