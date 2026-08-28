"use client";

import { useRef, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/*
  DAS Protokoll für destruktive Aktionen (Löschen, Entziehen, Zurücksetzen):
  ein Bestätigungs-MODAL. Erst der Klick auf „Ja, löschen" im Dialog submittet.

  Umsetzung als natives <dialog> (showModal): Top-Layer, Backdrop, Escape und
  Fokusfang gratis — und der Dialog bleibt ein Nachfahre des umgebenden Server-
  <form action={…}>, sodass der Bestätigen-Button (type=submit) genau dieses
  Formular absendet. Diese Client-Insel kennt weder Action noch Payload; hidden
  inputs bleiben, wo sie sind.

  Ohne JS submittet der Trigger direkt (Fallback wie zuvor — kein Confirm, aber
  keine tote Schaltfläche). Backdrop-Klick schließt; Escape schließt nativ.
*/
export function ConfirmButton({
  children,
  question = "Wirklich löschen?",
  confirmLabel = "Ja, löschen",
  ...buttonProps
}: ComponentProps<"button"> & {
  children: ReactNode;
  /** Frage im Modal. */
  question?: string;
  /** Beschriftung des bestätigenden Submit-Buttons. */
  confirmLabel?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="submit"
        onClick={(e) => {
          // Mit JS: Modal öffnen statt sofort submitten.
          e.preventDefault();
          dialogRef.current?.showModal();
        }}
        className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
        {...buttonProps}
      >
        {children}
      </button>

      <dialog
        ref={dialogRef}
        // Backdrop-Klick (Ziel = der Dialog selbst) schließt.
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current.close();
        }}
        className="m-auto max-w-sm rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0 text-[var(--color-fg)] backdrop:bg-black/50"
      >
        <div className="space-y-4 p-5">
          <p className="text-sm">{question}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-[var(--radius)] px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              Abbrechen
            </button>
            {/* Submit → sendet das umgebende <form> ab. Den Dialog SELBST
                schließen: eine Server-Action, die revalidiert (statt weg zu
                navigieren, z. B. „Plan löschen"), lässt das native <dialog>
                sonst offen — die re-gerenderte, wiederverwendete Komponente
                zeigte es dann weiter/erneut. close() verhindert das Absenden
                nicht (der Submit läuft als Default-Aktion des Klicks). */}
            <Button
              type="submit"
              variant="danger"
              size="sm"
              onClick={() => dialogRef.current?.close()}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
