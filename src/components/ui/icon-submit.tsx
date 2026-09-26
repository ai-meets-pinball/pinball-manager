"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { ICON_BTN } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";

/*
  Icon-Schaltfläche, die ein Formular ABSCHICKT (Häkchen, Senden, Umschalter in
  einer Zeile) — das Gegenstück zu `Button` für die 7×7-Zeilenoptik (ICON_BTN).
  Liest den Zustand des umgebenden <form> selbst (useFormStatus) und zeigt
  während der Action den Spinner statt des Icons; der Aufrufer muss nichts
  durchreichen. Lebt getrennt von icon-button.tsx, weil das ein Server-Modul
  ist (ICON_BTN importieren viele Server-Seiten) und Hooks Client-Code sind.
*/
export function IconSubmit({
  className = "",
  children,
  disabled,
  ...props
}: ComponentProps<"button">) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`${ICON_BTN} ${className}`}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending ? <Spinner size={14} /> : children}
    </button>
  );
}
