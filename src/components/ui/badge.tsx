import type { ReactNode } from "react";

/*
  EIN Badge-Rezept für getönte Status-/Label-Pillen. Die Tönung wird per
  color-mix aus einer semantischen Token-Farbe abgeleitet, sodass Hell- und
  Dunkelmodus automatisch passen. Vorher gab es dafür fünf parallele Stile
  (StatusBadge, lokale Chip/DueChip, farbiger Text, bespoke Danger-Pillen) mit
  drei verschiedenen Radien — die laufen jetzt alle hierüber.

  Für Reiter-Zähler (bordered, rundlich) gibt es bewusst ein eigenes, kleines
  Rezept: `CountPill` (count-pill.tsx). Badge = Status/Label, CountPill = Anzahl.
*/
export type BadgeTone =
  | "neutral"
  | "muted"
  | "accent"
  | "primary"
  | "success"
  | "warn"
  | "danger";

const toneVar: Record<BadgeTone, string> = {
  neutral: "var(--color-faint)",
  muted: "var(--color-faint)",
  accent: "var(--color-accent)",
  primary: "var(--color-primary)",
  success: "var(--color-success)",
  warn: "var(--color-warn)",
  danger: "var(--color-danger)",
};

export function Badge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  const c = toneVar[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[11px] font-semibold ${className}`}
      style={{ color: c, background: `color-mix(in srgb, ${c} 14%, transparent)` }}
    >
      {children}
    </span>
  );
}
