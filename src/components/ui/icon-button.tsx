import type { ComponentProps } from "react";
import Link from "next/link";

/*
  Runde Icon-Schaltfläche (Topbar: öffentliche Seite, Feedback, Theme, …). Die
  Chrome war 3× dupliziert (nav.tsx ×2, theme-toggle.tsx). `active` setzt den
  Akzent-Ring (z. B. aktiver Feedback-Knopf). Größe/Tap-Fläche wird in der
  Mobile-Phase auf ≥44px angehoben — hier zunächst wie gehabt (36px).
*/
const base =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors";
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
