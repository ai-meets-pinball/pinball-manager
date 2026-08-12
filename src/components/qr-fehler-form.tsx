"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { BildFeld } from "@/components/bild-feld";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { meldeFehlerPerQr } from "@/db/actions/qr-melden";
import type { FormState } from "@/db/actions/form-state";

/*
  Melde-Formular hinter dem QR-Code: bewusst minimal (Symptom + wer meldet).
  Angemeldete melden unter ihrem Konto; Gäste geben nur einen Namen an.
  Nach Erfolg ersetzt die Dankes-Ansicht das Formular — wer mehrere Fehler
  melden will, lädt per Knopf neu (verhindert versehentliche Doppel-Submits).
*/
export function QrFehlerForm({
  token,
  angemeldetAls,
}: {
  token: string;
  /** Name des angemeldeten Nutzers — null = Gast (Namensfeld erscheint). */
  angemeldetAls: string | null;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    meldeFehlerPerQr,
    {},
  );

  if (state.message) {
    return (
      <div className="space-y-4 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
        <CheckCircle2
          size={32}
          className="mx-auto text-[var(--color-success)]"
        />
        <p className="text-sm">{state.message}</p>
        <Button type="button" onClick={() => window.location.reload()}>
          Weiteren Fehler melden
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Field label="Was ist kaputt / was passiert?">
        <Textarea
          name="beschreibung"
          required
          rows={5}
          maxLength={2000}
          placeholder="z. B. Linker Flipperfinger reagiert nicht mehr …"
        />
      </Field>
      {angemeldetAls ? (
        <p className="text-sm text-[var(--color-muted)]">
          Du meldest als <span className="font-medium">{angemeldetAls}</span>.
        </p>
      ) : (
        <Field
          label="Dein Name"
          hint="Kein Konto nötig — nur damit die Werkstatt weiß, wer gemeldet hat."
        >
          <Input
            name="name"
            required
            maxLength={100}
            placeholder="Vorname genügt"
          />
        </Field>
      )}
      {/* Fotos vom Defekt — mobil direkt per Kamera. Kein <label> drumherum. */}
      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Fotos (optional)</span>
        <BildFeld />
      </div>
      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 size={16} className="animate-spin" /> : null}
        {pending ? "Sende…" : "Fehler melden"}
      </Button>
    </form>
  );
}
