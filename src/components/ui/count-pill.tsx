import type { ReactNode } from "react";

/*
  Kompakte, umrandete Pille (bordered, rundlich) — bewusst getrennt vom Status-
  `Badge` (getönte Füllung): Badge = Status/Label, CountPill = Anzahl bzw. eine
  kurze „needs attention"-Kennzeichnung. EIN Rezept für Reiter-Zähler,
  Wartungs-Fällig-Kennzeichen auf Karte UND in der Tabelle. Entweder `n`
  (einfacher Zähler) oder `children` (mit Icon/Text).
*/
export function CountPill({
  n,
  tone = "neutral",
  children,
}: {
  n?: number | string;
  tone?: "neutral" | "warn" | "danger" | "success";
  children?: ReactNode;
}) {
  const cls = {
    neutral: "border-[var(--color-border)] text-[var(--color-muted)]",
    warn: "border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 text-[var(--color-warn)]",
    danger:
      "border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
    success:
      "border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)]",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${cls}`}
    >
      {children ?? n}
    </span>
  );
}
