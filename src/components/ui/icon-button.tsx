import type { ComponentProps } from "react";
import Link from "next/link";

/*
  Runde Icon-Schaltfläche (Topbar: öffentliche Seite, Feedback, Theme, …). Die
  Chrome war 3× dupliziert (nav.tsx ×2, theme-toggle.tsx). `active` setzt den
  Akzent-Ring (z. B. aktiver Feedback-Knopf). Größe/Tap-Fläche wird in der
  Mobile-Phase auf ≥44px angehoben — hier zunächst wie gehabt (36px).
*/
const base =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors";
const ruhig =
  "border-[var(--color-border)] text-[var(--color-fg)] hover:bg-[var(--color-overlay)]";
const aktivRing =
  "border-[var(--color-border)] text-[var(--color-accent)] ring-2 ring-[var(--color-primary)]/40";

export function iconButtonStyles(active = false): string {
  return `${base} ${active ? aktivRing : ruhig}`;
}

export function IconButton({
  active = false,
  className = "",
  ...props
}: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button className={`${iconButtonStyles(active)} ${className}`} {...props} />
  );
}

export function IconButtonLink({
  active = false,
  className = "",
  ...props
}: ComponentProps<typeof Link> & { active?: boolean }) {
  return (
    <Link className={`${iconButtonStyles(active)} ${className}`} {...props} />
  );
}

/*
  Kleine, eckige Icon-Schaltfläche für Zeilen-Aktionen (Stift/Papierkorb, 14 px)
  — das Gegenstück zur runden Topbar-Variante oben. Deaktiviert bleibt sie
  sichtbar (ausgegraut) und trägt den Grund im `title`.
*/
export const ICON_BTN =
  "inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius)] text-[var(--color-muted)] transition-colors hover:bg-[var(--color-overlay)] hover:text-[var(--color-fg)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--color-muted)]";
