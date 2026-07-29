"use client";

import { useActionState, useState } from "react";
import { Check, ClipboardCopy, FileJson, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { VisibilityField } from "@/components/ui/visibility-field";
import { importManualFacts } from "@/db/actions/machine-data";
import {
  IMPORT_PROMPT,
  parseImportedFacts,
  type ImportResult,
} from "@/lib/import-facts";
import type { FormState } from "@/db/actions/clubs";

/*
  JSON-Import als Alternative zum KI-/PDF-Upload. Fluss: Prompt kopieren → in
  ChatGPT mit dem Handbuch nutzen → JSON hier einfügen → „Prüfen" (Vorschau +
  Warnungen, dieselbe parseImportedFacts wie serverseitig) → „Importieren".
  Der Import ist erst nach erfolgreicher Prüfung aktiv; jede Änderung am JSON
  verlangt erneutes Prüfen (Korrekturschleife).
*/
const LABELS: Record<string, string> = {
  coils: "Spulen & Flasher",
  switches: "Schalter-Matrix",
  lamps: "Lampen-Matrix",
  fuses: "Sicherungen",
  parts: "Teileliste",
  rules: "Regeln / Adjustments",
};

export function ManualJsonImport({ machineId }: { machineId: string }) {
  const [json, setJson] = useState("");
  const [check, setCheck] = useState<ImportResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    importManualFacts,
    {},
  );

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(IMPORT_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard nicht verfügbar — kein harter Fehler. */
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="flex items-center gap-2 font-medium">
          <FileJson size={16} className="text-[var(--color-primary)]" />
          Ohne Verarbeitung: aus ChatGPT-JSON importieren
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Mit ChatGPT-Abo: Handbuch dort hochladen, den Prompt einfügen und die
          JSON-Ausgabe hier einsetzen — spart die KI-Verarbeitung in der App.
        </p>
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={copyPrompt}
        className="self-start"
      >
        {copied ? <Check size={16} /> : <ClipboardCopy size={16} />}
        {copied ? "Prompt kopiert" : "ChatGPT-Prompt kopieren"}
      </Button>

      <Field label="Extrahiertes JSON">
        <Textarea
          value={json}
          onChange={(e) => {
            setJson(e.target.value);
            setCheck(null); // nach Änderung erneut prüfen
          }}
          rows={8}
          placeholder={'{ "coils": { "columns": [...], "rows": [...] }, ... }'}
          className="font-mono text-xs"
        />
      </Field>

      <label className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-muted)]">
        <span>oder .json-Datei:</span>
        <input
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              setJson(await f.text());
              setCheck(null);
            }
          }}
          className="text-xs file:mr-2 file:rounded-[var(--radius)] file:border-0 file:bg-[var(--color-inset)] file:px-2 file:py-1 file:text-[var(--color-fg)]"
        />
      </label>

      <Button
        type="button"
        variant="secondary"
        onClick={() => setCheck(parseImportedFacts(json))}
        disabled={!json.trim()}
        className="self-start"
      >
        Prüfen
      </Button>

      {check ? <Vorschau check={check} /> : null}

      {/* Import — erst nach erfolgreicher Prüfung aktiv. */}
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="machineId" value={machineId} />
        <input type="hidden" name="json" value={json} />
        <VisibilityField />
        {state.error ? (
          <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
        ) : null}
        {state.message ? (
          <p className="text-sm text-[var(--color-success)]">{state.message}</p>
        ) : null}
        <Button type="submit" disabled={pending || !check?.ok}>
          {pending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileJson size={16} />
          )}
          {pending ? "Importiere…" : "Importieren"}
        </Button>
      </form>
    </div>
  );
}

function Vorschau({ check }: { check: ImportResult }) {
  const box = "rounded-[var(--radius)] border p-3 text-sm";

  if (check.errors.length > 0) {
    return (
      <div
        className={`${box} border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10`}
      >
        <p className="font-medium text-[var(--color-danger)]">Bitte korrigieren:</p>
        <ul className="mt-1 list-disc pl-5 text-[var(--color-danger)]">
          {check.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={`${box} border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 text-[var(--color-warn)]`}
      >
        <strong>Achtung:</strong> Der Import ersetzt ALLE bisherigen
        Handbuch-Daten dieser Maschine. Typen, die nicht im JSON enthalten sind,
        werden entfernt.
      </div>
      <ul className="space-y-1 text-sm">
        {check.reports.map((r) => (
          <li key={r.typ} className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{LABELS[r.typ] ?? r.typ}</span>
            <span className="text-[var(--color-muted)]">· {r.rows} Zeilen</span>
            <span
              className={
                r.columnsOk
                  ? "text-[var(--color-success)]"
                  : "text-[var(--color-warn)]"
              }
            >
              {r.columnsOk ? "✓ Spalten ok" : "⚠ Spalten abweichend"}
            </span>
            {r.matrix !== null ? (
              <span className="text-[var(--color-muted)]">
                {r.matrix ? "· Matrix ✓" : "· keine Matrix"}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {check.warnings.length > 0 ? (
        <ul className="list-disc pl-5 text-xs text-[var(--color-muted)]">
          {check.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
