"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/*
  DIE Hülle für Neu/Ändern-Dialoge: natives <dialog> wie ConfirmButton —
  Top-Layer, Backdrop, Escape und Fokusfang gratis. Der Aufrufer mountet sie nur,
  solange der Dialog offen ist (so startet jede Öffnung mit frischem Formular-
  und Fehlerzustand): showModal() beim Mount, `ok` (Erfolg der Action) schließt,
  Escape/Backdrop lösen das native close-Event aus, das onClose ruft. Das
  <form action={…}> legt der Aufrufer als Kind hinein.
*/
export function ActionDialog({
  onClose,
  ok = false,
  breit = false,
  children,
}: {
  onClose: () => void;
  /** true = die Action war erfolgreich → Dialog schließt. */
  ok?: boolean;
  /** Breite Variante für Tabellen-/JSON-Editoren (statt 24rem bis 48rem). */
  breit?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* showModal() wirft „already open as a non-modal dialog", wenn das <dialog>
       noch `open` trägt, aber nicht mehr im Top-Layer ist. Das passiert real:
       die Action revalidiert die Seite, React baut den Zeilen-Baum neu auf und
       hängt den Dialog-Knoten um — Umhängen wirft ihn aus dem Top-Layer, das
       Attribut bleibt. Der Fehler war uncaught und riss die Seite in „This page
       couldn't load" (e2e/umbenennen.spec.ts, Generation umbenennen).

       Altlast per removeAttribute("open") räumen, NICHT per close(): close()
       feuert das close-Event, das <dialog onClose> an den Aufrufer reicht, der
       den Dialog daraufhin unmontiert — mit close() im Cleanup schloss sich
       jeder Dialog sofort wieder (StrictMode läuft den Effekt im Dev-Modus
       doppelt). removeAttribute schließt laut Spec OHNE close-Event. */
    if (el.open) el.removeAttribute("open");
    el.showModal();
    return () => {
      if (el.open) el.removeAttribute("open");
    };
  }, []);
  useEffect(() => {
    if (ok) onClose();
  }, [ok, onClose]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Backdrop-Klick (Ziel = der Dialog selbst) schließt.
        if (e.target === ref.current) ref.current.close();
      }}
      className={`m-auto ${
        breit
          ? "w-[min(48rem,calc(100vw-2rem))]"
          : "w-[min(24rem,calc(100vw-2rem))]"
      } rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0 text-[var(--color-fg)] backdrop:bg-black/50`}
    >
      {children}
    </dialog>
  );
}

/** Abbrechen-Knopf für ein Formular im ActionDialog: schließt den umgebenden Dialog. */
export function DialogAbbrechen({ children = "Abbrechen" }: { children?: ReactNode }) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={(e) => e.currentTarget.closest("dialog")?.close()}
    >
      {children}
    </Button>
  );
}
