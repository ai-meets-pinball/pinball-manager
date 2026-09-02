"use client";

import { useActionState, useState } from "react";
import { Check, ClipboardCopy, FileJson, Loader2 } from "lucide-react";
import { DialogAbbrechen } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { FormFeedback } from "@/components/ui/form-feedback";
import { VisibilityField } from "@/components/ui/visibility-field";
import { GueltigkeitFeld } from "@/components/troubleshooting-generate";
import { importTroubleshootingGuide } from "@/db/actions/machine-data";
import {
  parseGuideText,
  type GuideImportResult,
} from "@/lib/import-guide";
import type { FormState } from "@/db/actions/form-state";

/*
  JSON-Import als Alternative zur KI-Generierung des Troubleshooting-Guides —
  lebt im „Guide erstellen"-Dialog (guide-erstellen.tsx) hinter dem Modus
  „JSON importieren". Gleiches Prinzip wie ManualJsonImport: Prompt kopieren →
  extern (z. B. ChatGPT) ausführen → JSON hier einfügen → „Prüfen" (Vorschau,
  dieselbe parseGuideText wie serverseitig) → „Importieren". Der Prompt ist
  maschinenspezifisch (Hersteller/Modell/Baujahr) und kommt deshalb als Prop
  vom Server. Import erst nach erfolgreicher Prüfung; jede Änderung am JSON
  verlangt erneutes Prüfen. Erfolg meldet `onErfolg` (schließt den Dialog).
*/
export function TroubleshootingJsonImport({
  machineId,
  prompt,
  vorhanden,
  generation,
  onErfolg,
}: {
  machineId: string;
  /** Der kopierbare ChatGPT-Prompt (serverseitig via buildGuideImportPrompt). */
  prompt: string;
  /** Eigener Guide existiert bereits → Ersetzen-Hinweis in der Vorschau. */
  vorhanden: boolean;
  /** Generation des Modells (falls bekannt) — erlaubt einen Guide, der für
      ALLE Modelle dieser Board-/Hardware-Generation gilt. */
  generation?: { name: string } | null;
  /** Wird nach erfolgreichem Import gerufen (schließt den Dialog). */
  onErfolg?: () => void;
}) {
  const [json, setJson] = useState("");
  const [check, setCheck] = useState<GuideImportResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const res = await importTroubleshootingGuide(prev, fd);
      if (res.message) onErfolg?.();
      return res;
    },
    {},
  );

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard nicht verfügbar — kein harter Fehler. */
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-muted)]">
        Mit ChatGPT-Abo: den Prompt dort einfügen (er enthält bereits
        Hersteller, Modell und Baujahr) und die JSON-Ausgabe hier einsetzen —
        spart die KI-Erstellung in der App.
      </p>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={copyPrompt}
        className="self-start"
      >
        {copied ? <Check size={16} /> : <ClipboardCopy size={16} />}
        {copied ? "Prompt kopiert" : "ChatGPT-Prompt kopieren"}
      </Button>

      <Field label="Guide-JSON">
        <Textarea
          value={json}
          onChange={(e) => {
            setJson(e.target.value);
            setCheck(null); // nach Änderung erneut prüfen
          }}
          rows={8}
          placeholder={'{ "plattform": "...", "abschnitte": [...], "quellen": [...] }'}
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

      {check ? <Vorschau check={check} vorhanden={vorhanden} /> : null}

      {/* Import — erst nach erfolgreicher Prüfung aktiv. */}
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="machineId" value={machineId} />
        <input type="hidden" name="json" value={json} />

        <GueltigkeitFeld generation={generation} />
        <VisibilityField objekt="diesen Guide" />
        <FormFeedback state={state} />

        <div className="flex flex-wrap justify-end gap-2">
          <DialogAbbrechen />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setCheck(parseGuideText(json))}
            disabled={!json.trim()}
          >
            Prüfen
          </Button>
          <Button type="submit" size="sm" disabled={pending || !check?.ok}>
            {pending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileJson size={16} />
            )}
            {pending ? "Importiere…" : "Guide importieren"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Vorschau({
  check,
  vorhanden,
}: {
  check: GuideImportResult;
  vorhanden: boolean;
}) {
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
      {vorhanden ? (
        <div
          className={`${box} border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 text-[var(--color-warn)]`}
        >
          <strong>Achtung:</strong> Der Import ersetzt deinen bisherigen Guide
          auf der gewählten Ebene — der alte Stand wandert in den Verlauf.
        </div>
      ) : null}
      <p className="text-sm">
        {check.plattform.trim() ? (
          <>
            <span className="font-medium">Plattform:</span> {check.plattform}
            {" · "}
          </>
        ) : null}
        {check.abschnitte} Abschnitte · {check.bloecke} Blöcke (davon{" "}
        {check.tabellen} Tabellen) · {check.quellen} Quellen
      </p>
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
