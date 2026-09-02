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
    ref.current?.showModal();
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
