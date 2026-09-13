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
  Verdrahten je Feld nötig.

  Immer UNSER Modal, nie der Browser-Prompt (Redlining 2026-09-13): der native
  beforeunload-Dialog („Leave site?") lässt sich weder übersetzen noch
  gestalten, darum ist er weg. Stattdessen fängt ein Klick-Listener in der
  Capture-Phase jeden In-App-Link (Top-Nav, Zurück-Link, Reiter) ab, solange
  das Formular dirty ist, und zeigt das Modal — „Verwerfen" geht dann dorthin,
  wohin geklickt wurde. Tab schließen und Neuladen bleiben ungewarnt: dafür
  gäbe es nur den nativen Dialog, und den will Frank nicht.

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

  // Wohin „Verwerfen" führt: der angeklickte Link — oder backHref (Abbrechen).
  const ziel = useRef<string>(backHref);

  const formEl = () => rootRef.current?.closest("form") ?? null;
  const dirty = () =>
    initial.current !== null && serialize(formEl()) !== initial.current;

  useEffect(() => {
    // Ausgangsstand nach dem ersten Paint schnappen (Vorbelegung inkl. Chips).
    initial.current = serialize(formEl());
    const handler = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      if (a.origin !== window.location.origin) return;
      if (rootRef.current?.contains(a)) return; // eigene Knöpfe im Modal
      if (formEl()?.contains(a)) return; // Links IM Formular (z. B. Hilfe) lassen
      if (!dirty()) return;
      e.preventDefault();
      e.stopPropagation();
      ziel.current = a.pathname + a.search + a.hash;
      dialogRef.current?.showModal();
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span ref={rootRef} className="contents">
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          ziel.current = backHref;
          if (dirty()) dialogRef.current?.showModal();
          else router.push(backHref);
        }}
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
                router.push(ziel.current);
              }}
              className="rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
            >
              Verwerfen
            </button>
            {/* Echter Submit des umgebenden Formulars — Dialog dabei selbst
                schließen (wie bei ConfirmButton), damit er nicht offen bleibt,
                falls die Action revalidiert statt wegzunavigieren. */}
            <Button
              type="submit"
              size="sm"
              onClick={() => dialogRef.current?.close()}
            >
              Speichern
            </Button>
          </div>
        </div>
      </dialog>
    </span>
  );
}
