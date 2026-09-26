"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";

type Variant = "primary" | "secondary" | "danger";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress aria-busy:opacity-100";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:bg-[var(--color-accent)] hover:text-[var(--color-primary-fg)]",
  secondary:
    "border border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
  danger:
    "bg-[var(--color-danger)] text-[var(--color-primary-fg)] hover:opacity-90",
};

/* "sm" ist das Zeilen-Format (Listen-Aktionen, Inline-Formulare) — ersetzt die
   früher handgerollten `px-3 py-1.5`-Buttons. "md" bleibt der Standard. */
const sizes: Record<Size, string> = {
  md: "px-4 py-2",
  sm: "px-3 py-1.5",
};

/* Klassen-String zentral — damit ein Link (ButtonLink) exakt wie ein Button
   aussieht, ohne die Optik ein zweites Mal von Hand nachzubauen. */
export function buttonStyles({
  variant = "primary",
  size = "md",
  className = "",
}: { variant?: Variant; size?: Size; className?: string } = {}): string {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

/*
  Sofortiges Feedback nach dem Klick (Feedback 09/2026): ein Submit-Button
  liest den Zustand seines <form> selbst (useFormStatus) und zeigt während der
  Action einen Spinner — in jedem Formular, auch in Server-Formularen und in
  ActionForm, ohne dass der Aufrufer etwas durchreicht. Die Kinder bleiben
  unsichtbar im Fluss (Breite stabil, kein doppeltes Icon), der Spinner liegt
  zentriert darüber. `type="button"` (Dialog öffnen, Abbrechen) spinnt nie —
  außer der Aufrufer sagt es per `pending` (Buttons außerhalb eines Formulars,
  useTransition).

  ComponentProps<"button"> schließt in React 19 auch `ref` ein — Refs werden
  ohne forwardRef einfach durchgereicht (nutzt z. B. ConfirmButton für den
  Fokus-Sprung auf „Ja …").
*/
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  pending,
  disabled,
  type,
  children,
  ...props
}: ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  /** Erzwingt den Wartezustand (sonst: Submit in einem laufenden Formular). */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const laeuft = pending ?? (status.pending && (type ?? "submit") === "submit");
  return (
    <button
      type={type}
      className={`${buttonStyles({ variant, size, className })} relative`}
      disabled={disabled || laeuft}
      aria-busy={laeuft || undefined}
      {...props}
    >
      {laeuft ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size={size === "sm" ? 14 : 16} />
        </span>
      ) : null}
      <span className={`inline-flex items-center gap-2 ${laeuft ? "invisible" : ""}`}>
        {children}
      </span>
    </button>
  );
}

/* Wie `Button`, aber als `next/link` — für Primär-Aktionen, die navigieren
   („Neue Maschine", „Neuer Fehler" …). Vorher wurden solche CTAs von Hand
   gebaut und wichen vom Akzent-Hover ab. Wartezustand beim Navigieren zeigt
   die loading.tsx der Routen-Gruppe. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
}) {
  return <Link className={buttonStyles({ variant, size, className })} {...props} />;
}
