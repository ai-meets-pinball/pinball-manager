"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { BildFeld } from "@/components/bild-feld";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { meldeFehlerPerSammelQr } from "@/db/actions/qr-melden";
import type { FormState } from "@/db/actions/form-state";

/*
  Melde-Formular hinter dem SAMMEL-QR: identisch zum Geräte-QR-Formular, aber es
  trägt den Sammlungs-Code + die gewählte machineId (statt des Geräte-Tokens) und
  postet an meldeFehlerPerSammelQr → der Fehler wird als „sammel_qr" markiert.
*/
export function SammelFehlerForm({
  code,
  machineId,
  angemeldetAls,
}: {
  code: string;
  machineId: string;
  /** Name des angemeldeten Nutzers — null = Gast (Namensfeld erscheint). */
  angemeldetAls: string | null;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    meldeFehlerPerSammelQr,
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
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="machineId" value={machineId} />
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
