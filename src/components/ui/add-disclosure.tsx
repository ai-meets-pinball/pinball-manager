import type { ReactNode } from "react";
import { Plus } from "lucide-react";

/*
  „Neu X"-Aufklapper: zeigt zunächst NUR einen Button; ein Klick enthüllt das
  Formular. Natives <details> — funktioniert ohne JS und ohne Client-Komponente.
  Vereinheitlicht die vorher dauerhaft offenen Inline-Formulare (Plan, Mitglied,
  Generation, Einladung) und passt optisch zum „＋ Neue X"-Button der Sub-Listen.
  Das Plus dreht beim Öffnen zu einem ×.
*/
export function AddDisclosure({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-fg)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] [&::-webkit-details-marker]:hidden">
        <Plus
          size={15}
          className="transition-transform group-open:rotate-45"
        />
        {label}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
