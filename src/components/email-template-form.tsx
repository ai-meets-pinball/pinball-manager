"use client";

import { RotateCcw, Save } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { FormState } from "@/db/actions/clubs";
import {
  resetEmailTemplate,
  saveEmailTemplate,
} from "@/db/actions/email-templates";
import { renderPlaceholders } from "@/lib/email-templates";

/*
  Editor für eine E-Mail-Vorlage. Betreff und Einleitungstext sind anpassbar;
  Button mit Einladungslink und Gültigkeitshinweis stehen fest im Code (siehe
  lib/email.ts) — deshalb sind sie hier nur als grauer Kontext dargestellt.
*/

/** Beispielwerte für die Vorschau — rein zur Anzeige. */
const BEISPIEL: Record<string, string> = {
  einlader: "Frank",
  clubname: "FlipperFreunde Fellbach",
};

export function EmailTemplateForm({
  templateKey,
  label,
  beschreibung,
  platzhalter,
  subject,
  body,
  angepasst,
  ctaLabel,
  hinweis,
}: {
  templateKey: string;
  label: string;
  beschreibung: string;
  platzhalter: string[];
  subject: string;
  body: string;
  angepasst: boolean;
  ctaLabel: string;
  hinweis: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveEmailTemplate,
    {},
  );
  const [betreff, setBetreff] = useState(subject);
  const [text, setText] = useState(body);

  return (
    <div className="space-y-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-medium">
            {label}{" "}
            <span className="font-mono text-xs text-[var(--color-faint)]">
              {templateKey}
            </span>
          </p>
          <p className="text-sm text-[var(--color-muted)]">{beschreibung}</p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-[var(--color-faint)]">
          {angepasst ? "angepasst" : "Standardtext"}
        </span>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="key" value={templateKey} />
        <Field label="Betreff">
          <Input
            name="subject"
            value={betreff}
            onChange={(e) => setBetreff(e.target.value)}
            required
          />
        </Field>
        <Field
          label="Text"
          hint={`Verfügbare Platzhalter: ${platzhalter.join(", ")}`}
        >
          <Textarea
            name="body"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
        </Field>

        {/* Vorschau mit Beispielwerten */}
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.5px] text-[var(--color-faint)]">
            Vorschau
          </p>
          <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm">
            <p className="font-medium">
              {renderPlaceholders(betreff, BEISPIEL)}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[var(--color-muted)]">
              {renderPlaceholders(text, BEISPIEL)}
            </p>
            <p className="mt-3">
              <span className="inline-block rounded-[var(--radius)] bg-[var(--color-primary)] px-3 py-1.5 text-xs text-[var(--color-primary-fg)]">
                {ctaLabel}
              </span>
              <span className="ml-2 text-xs text-[var(--color-faint)]">
                (fest — enthält den Einladungslink)
              </span>
            </p>
            <p className="mt-2 text-xs text-[var(--color-faint)]">{hinweis}</p>
          </div>
        </div>

        {state.error ? (
          <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
        ) : null}
        {state.message ? (
          <p className="text-sm text-[var(--color-success)]">{state.message}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={pending}>
            <Save size={16} /> {pending ? "Speichern…" : "Speichern"}
          </Button>
        </div>
      </form>

      {angepasst ? (
        <form action={resetEmailTemplate}>
          <input type="hidden" name="key" value={templateKey} />
          <button
            type="submit"
            className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          >
            <RotateCcw size={13} /> Auf Standardtext zurücksetzen
          </button>
        </form>
      ) : null}
    </div>
  );
}
