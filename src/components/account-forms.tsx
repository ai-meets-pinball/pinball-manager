"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Field, Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import { removeAvatar, updateProfile } from "@/db/actions/profile";
import { changeEmail, changePassword } from "@/lib/auth-client";
import { initialen } from "@/lib/format";
import { PASSWORD_HINT, validatePassword } from "@/lib/validators";
import type { FormState } from "@/db/actions/clubs";

/** Profil: Vorname/Nachname/Initialen + Profilbild. Der Anzeigename (`name`)
    wird serverseitig aus Vor- + Nachname abgeleitet (db/actions/profile.ts). */
export function ProfileForm({
  vorname,
  nachname,
  initialenWert,
  avatar,
  name,
  email,
}: {
  vorname: string | null;
  nachname: string | null;
  initialenWert: string | null;
  avatar: string | null;
  name: string;
  email: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateProfile,
    {},
  );

  // Vorbefüllung für Bestandsnutzer: Name in Vor-/Nachname aufteilen.
  const [erstes, ...rest] = name.trim().split(/\s+/);
  const kuerzel = initialen({
    initials: initialenWert,
    firstName: vorname,
    lastName: nachname,
    name,
    email,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar image={avatar} kuerzel={kuerzel} size={56} />
        {avatar ? (
          <form action={removeAvatar}>
            <button
              type="submit"
              className="text-xs text-[var(--color-muted)] underline hover:text-[var(--color-fg)]"
            >
              Bild entfernen
            </button>
          </form>
        ) : (
          <p className="text-xs text-[var(--color-muted)]">
            Ohne Bild zeigen wir deine Initialen.
          </p>
        )}
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Vorname">
            <Input name="vorname" defaultValue={vorname ?? erstes ?? ""} required />
          </Field>
          <Field label="Nachname">
            <Input
              name="nachname"
              defaultValue={nachname ?? rest.join(" ")}
              required
            />
          </Field>
        </div>
        <Field
          label="Initialen (optional)"
          hint="Standard: erste Buchstaben von Vor- und Nachname."
        >
          <Input
            name="initialen"
            defaultValue={initialenWert ?? ""}
            maxLength={3}
            className="max-w-24 uppercase"
          />
        </Field>
        <Field label="Profilbild (optional)" hint="Wird in der Kopfzeile gezeigt.">
          <Input name="avatar" type="file" accept="image/*" />
        </Field>
        <FormFeedback state={state} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Speichern…" : "Profil speichern"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** E-Mail-Adresse ändern. Ist die bisherige Adresse verifiziert, verschickt
    Better Auth einen Bestätigungslink an die BISHERIGE Adresse. */
export function EmailForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMsg(null);
    setError(null);

    const neu = String(new FormData(event.currentTarget).get("email"))
      .trim()
      .toLowerCase();
    if (!neu) {
      setError("E-Mail ist erforderlich.");
      return;
    }
    if (neu === initialEmail.toLowerCase()) {
      setError("Das ist bereits deine aktuelle Adresse.");
      return;
    }

    setLoading(true);
    const { error } = await changeEmail({
      newEmail: neu,
      callbackURL: "/account",
    });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Änderung fehlgeschlagen");
      return;
    }
    setMsg(
      `Bestätigungslink an ${initialEmail} verschickt. Die Adresse wird erst nach dem Klick geändert.`,
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="E-Mail-Adresse">
        <Input
          name="email"
          type="email"
          defaultValue={initialEmail}
          required
          autoComplete="email"
        />
      </Field>
      {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
      {msg ? <p className="text-sm text-[var(--color-success)]">{msg}</p> : null}
      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Senden…" : "E-Mail ändern"}
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
