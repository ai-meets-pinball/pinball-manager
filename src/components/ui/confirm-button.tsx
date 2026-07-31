"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";

/*
  DAS Protokoll für destruktive Aktionen (Löschen, Entziehen, Zurücksetzen).
  Vorher: vier verschiedene Ein-Klick-Stile, alle OHNE Bestätigung. Jetzt:
  Zwei-Schritt-Inline-Confirm — erster Klick „bewaffnet" (Frage + Ja/Abbrechen
  erscheinen an Ort und Stelle), erst der zweite Klick submittet.

  Bewusst KEIN window.confirm (OS-Chrome, englische Buttons, blockierend) und
  KEIN <dialog>/Modal (dreifacher Code für Zeilen-Aktionen; Upgrade-Pfad, falls
  eine Bestätigung je Eingabefelder braucht). Kleinste Client-Insel: dieser
  Button sitzt IM bestehenden Server-<form action={…}> und kennt weder die
  Action noch die Payload — hidden inputs bleiben, wo sie sind.

  A11y/Verhalten: Fokus springt beim Bewaffnen auf „Ja …"; Escape, Fokusverlust
  oder 5 s Inaktivität entwaffnen; aria-live kündigt die Frage an. Ohne JS
  submittet der Trigger direkt (heutiges Verhalten — keine Regression).
*/
export function ConfirmButton({
  children,
  question = "Wirklich?",
  confirmLabel = "Ja, löschen",
  ...buttonProps
}: ComponentProps<"button"> & {
  children: ReactNode;
  /** Inline-Rückfrage im bewaffneten Zustand. */
  question?: string;
  /** Beschriftung des bestätigenden Submit-Buttons. */
  confirmLabel?: string;
}) {
  const [armed, setArmed] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!armed) return;
    confirmRef.current?.focus();
    const timer = setTimeout(() => setArmed(false), 5000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setArmed(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [armed]);

  if (armed) {
    return (
      <span
        ref={wrapRef}
        aria-live="polite"
        className="inline-flex flex-wrap items-center gap-2"
        onBlur={(e) => {
          // Entwaffnen, wenn der Fokus den Bestätigungsbereich verlässt.
          if (!wrapRef.current?.contains(e.relatedTarget as Node)) {
            setArmed(false);
          }
        }}
      >
        <span className="text-xs text-[var(--color-danger)]">{question}</span>
        <Button ref={confirmRef} type="submit" variant="danger" size="sm">
          {confirmLabel}
        </Button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          Abbrechen
        </button>
      </span>
    );
  }

  return (
    <button
      type="submit"
      onClick={(e) => {
        e.preventDefault();
        setArmed(true);
      }}
      className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
      {...buttonProps}
    >
      {children}
    </button>
  );
}
