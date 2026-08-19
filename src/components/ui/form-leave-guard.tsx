"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/*
  „Abbrechen"/Zurück für Formulare, die sonst nur „Speichern" kennen (kein
  Weg zurück = Sackgasse). Gibt es ungespeicherte Änderungen, fragt ein Modal
  „Speichern / Verwerfen / Weiter bearbeiten" statt still zu verwerfen.

  Dirty wird GENERISCH erkannt: der komplette Formular-Stand (FormData, inkl. der
  Hidden-Inputs von Chip-Listen wie Besitzer/Ausstattung und der Datei-Auswahl)
  wird nach dem ersten Paint geschnappt und beim Verlassen verglichen — kein
  Verdrahten je Feld nötig. Zusätzlich warnt der Browser beim Schließen/Neuladen
  (beforeunload). In-App-Navigation über ANDERE Links (Top-Nav) fängt der
  App-Router-seitig nicht ab; abgesichert ist der Abbrechen-Weg + Reload/Close.

  MUSS INNERHALB des <form> stehen: der „Speichern"-Knopf im Modal ist ein echter
  Submit dieses Formulars (wie ConfirmButton).
*/
function serialize(form: HTMLFormElement | null): string {
  if (!form) return "";
  const parts: string[] = [];
  for (const [k, v] of new FormData(form).entries()) {
    parts.push(
      v instanceof File ? `${k}=file:${v.name}:${v.size}` : `${k}=${v}`,
    );
  }
  return parts.join("&");
}

export function FormLeaveGuard({
  backHref,
  label = "Abbrechen",
}: {
  /** Ziel beim Verlassen (woher der Nutzer kam). */
  backHref: string;
  label?: string;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLSpanElement>(null);
  const initial = useRef<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const formEl = () => rootRef.current?.closest("form") ?? null;
  const dirty = () =>
    initial.current !== null && serialize(formEl()) !== initial.current;

  useEffect(() => {
    // Ausgangsstand nach dem ersten Paint schnappen (Vorbelegung inkl. Chips).
    initial.current = serialize(formEl());
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span ref={rootRef} className="contents">
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          dirty() ? dialogRef.current?.showModal() : router.push(backHref)
        }
      >
        {label}
      </Button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current.close();
        }}
        className="m-auto max-w-sm rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0 text-[var(--color-fg)] backdrop:bg-black/50"
      >
        <div className="space-y-4 p-5">
          <p className="text-sm">
            Ungespeicherte Änderungen. Möchtest du sie speichern oder verwerfen?
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-[var(--radius)] px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              Weiter bearbeiten
            </button>
            <button
              type="button"
              onClick={() => {
                dialogRef.current?.close();
                router.push(backHref);
              }}
              className="rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
            >
              Verwerfen
            </button>
            {/* Echter Submit des umgebenden Formulars. */}
            <Button type="submit" size="sm">
              Speichern
            </Button>
          </div>
        </div>
      </dialog>
    </span>
  );
}
