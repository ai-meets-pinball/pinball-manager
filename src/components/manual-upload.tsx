"use client";

import { useActionState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { ApiKeyField } from "@/components/ui/api-key-field";
import { Button } from "@/components/ui/button";
import { extractManualFacts, type ExtractState } from "@/lib/manual-extract";

/*
  Upload eines eigenen Handbuchs (PDF) zur Fakten-Extraktion. Die Attestation-
  Checkbox ist Pflicht; die echte Prüfung passiert serverseitig (manual-extract.ts).
  Das PDF wird nie gespeichert — nur die extrahierten Faktentabellen.
*/

const LABELS: Record<string, string> = {
  coils: "Spulen",
  switches: "Schalter",
  lamps: "Lampen",
  fuses: "Sicherungen",
  parts: "Teile",
  rules: "Regeln",
};

function summary(counts: Record<string, number>): string {
  const parts = Object.entries(counts).map(
    ([typ, n]) => `${LABELS[typ] ?? typ} (${n})`,
  );
  return parts.length > 0
    ? `Extrahiert: ${parts.join(", ")}.`
    : "Keine Tabellen im Handbuch gefunden.";
}

export function ManualUpload({
  machineId,
  kiKonfiguriert,
}: {
  machineId: string;
  /** false = kein zentraler API-Key → ephemeres Key-Feld einblenden. */
  kiKonfiguriert: boolean;
}) {
  const [state, formAction, pending] = useActionState<ExtractState, FormData>(
    extractManualFacts,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="machineId" value={machineId} />

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Handbuch (PDF)</span>
        <input
          name="manual"
          type="file"
          accept="application/pdf"
          required
          className="w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-fg)] outline-none file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-[var(--color-inset)] file:px-3 file:py-1 file:text-[var(--color-fg)] focus:border-[var(--color-accent)]"
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-[var(--color-muted)]">
        <input
          type="checkbox"
          name="attest"
          required
          className="mt-0.5 accent-[var(--color-accent)]"
        />
        <span>
          Ich bestätige, dass ich dieses Handbuch besitze bzw. die Rechte habe, es
          zu verarbeiten. Es wird nicht gespeichert — nur die extrahierten
          Faktentabellen (Spulen, Lampen, Schalter, Sicherungen, Teile, Regeln).
        </span>
      </label>

      {!kiKonfiguriert ? <ApiKeyField /> : null}

      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}
      {state.counts ? (
        <p className="text-sm text-[var(--color-success)]">
          {summary(state.counts)}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Extrahiere…
          </>
        ) : (
          <>
            <FileText size={16} /> Handbuch auswerten
          </>
        )}
      </Button>
    </form>
  );
}
