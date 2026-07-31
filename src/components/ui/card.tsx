import type { ReactNode } from "react";

/* DAS Oberflächen-Rezept (Rahmen + Fläche + Radius + Innenabstand). Exportiert,
   damit ListRow (ui/list.tsx) dieselbe Oberfläche nutzt, ohne sie zu duplizieren. */
export const cardSurface =
  "rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`${cardSurface} ${className}`}>{children}</div>;
}
