"use client";

import { KeyRound } from "lucide-react";

/*
  Ephemeres Eingabefeld für einen eigenen Claude-(Anthropic-)API-Schlüssel.

  Sicherheits-Leitplanken (bewusst):
  - `type="password"`, uncontrolled (kein React-State), `autoComplete="off"` —
    der Wert lebt nur im Formularfeld und wird mit dem Absenden als Teil der
    Server-Action (HTTPS-POST) übertragen. Er wird NICHT gespeichert, nicht in
    localStorage abgelegt und serverseitig nie geloggt (siehe lib/manual-extract,
    lib/troubleshooting, db/actions/maintenance).
  - Wird nur angezeigt, wenn kein zentraler Schlüssel konfiguriert ist.
*/
export function ApiKeyField() {
  return (
    <div className="space-y-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <KeyRound size={14} /> Claude-API-Schlüssel
        </span>
        <input
          name="apiKey"
          type="password"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-ant-…"
          className="w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]"
        />
      </label>

      <p className="text-xs text-[var(--color-muted)]">
        Diese Funktion nutzt Claude (Anthropic). Es ist kein zentraler Schlüssel
        hinterlegt — bitte deinen eigenen eingeben. Er wird{" "}
        <strong>nur für diese Aktion</strong> über eine verschlüsselte Verbindung
        genutzt und <strong>nicht gespeichert</strong>.
      </p>

      <details className="group text-xs">
        <summary className="cursor-pointer list-none text-[var(--color-primary)] hover:underline [&::-webkit-details-marker]:hidden">
          Woher bekomme ich einen Schlüssel? · Kosten begrenzen
        </summary>
        <div className="mt-2 space-y-2 text-[var(--color-muted)]">
          <ol className="list-decimal space-y-1 pl-4">
            <li>
              Konto auf{" "}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-primary)] hover:underline"
              >
                console.anthropic.com
              </a>{" "}
              anlegen bzw. anmelden.
            </li>
            <li>
              Unter <strong>API Keys</strong> einen Schlüssel erstellen (beginnt
              mit <code>sk-ant-</code>) und hier einfügen.
            </li>
            <li>
              Unter <strong>Billing</strong> etwas Guthaben aufladen — die
              Claude-API ist nutzungsbasiert und <strong>nicht</strong> im Pro-/
              Max-Abo enthalten.
            </li>
            <li>
              <strong>Limit setzen:</strong> unter{" "}
              <strong>Billing → Limits</strong> ein monatliches Ausgabenlimit
              festlegen, damit keine unerwarteten Kosten entstehen.
            </li>
          </ol>
          <p>
            Eine Auswertung kostet je nach Umfang typischerweise wenige Cent bis
            einige zehn Cent. Der Schlüssel wird nur hier verwendet — du kannst
            ihn in der Anthropic-Konsole jederzeit widerrufen.
          </p>
        </div>
      </details>
    </div>
  );
}
