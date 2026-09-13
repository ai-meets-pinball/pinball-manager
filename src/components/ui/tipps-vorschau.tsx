"use client";

import { useState } from "react";
import { Check, ClipboardCopy, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

/*
  Tipps zur Import-Prüfung plus der kopierbare Nachfrage-Prompt
  (lib/import-tipps). Unter der Vorschau beider JSON-Importe; zeigt nichts,
  wenn es nichts zu sagen gibt.
*/
export function TippsVorschau({
  tipps,
  nachfrage,
}: {
  tipps: string[];
  nachfrage: string | null;
}) {
  const [copied, setCopied] = useState(false);
  if (tipps.length === 0 && !nachfrage) return null;

  async function kopieren() {
    if (!nachfrage) return;
    try {
      await navigator.clipboard.writeText(nachfrage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard nicht verfügbar — kein harter Fehler. */
    }
  }

  return (
    <div className="space-y-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-sm">
      {tipps.length > 0 ? (
        <>
          <p className="flex items-center gap-1.5 font-medium">
            <Lightbulb size={14} /> Tipps für den nächsten Versuch
          </p>
          <ul className="list-disc space-y-1 pl-5 text-[var(--color-muted)]">
            {tipps.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </>
      ) : null}
      {nachfrage ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={kopieren}>
            {copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
            {copied ? "Nachfrage kopiert" : "Nachfrage kopieren"}
          </Button>
          <span className="text-xs text-[var(--color-muted)]">
            In denselben Chat einfügen — das Modell kennt den Prompt noch.
          </span>
        </div>
      ) : null}
    </div>
  );
}
