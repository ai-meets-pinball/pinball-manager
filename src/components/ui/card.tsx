import type { ReactNode } from "react";

/* DAS Oberflächen-Rezept (Rahmen + Fläche + Radius + Innenabstand). Exportiert,
   damit ListRow (ui/list.tsx) dieselbe Oberfläche nutzt, ohne sie zu duplizieren. */
export const cardSurface =
  "rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4";

export function Card({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  /** Optionaler Anker, z. B. als Ziel eines #-Sprungs. */
  id?: string;
}) {
  return (
    <div id={id} className={`${cardSurface} ${className}`}>
      {children}
    </div>
  );
}
