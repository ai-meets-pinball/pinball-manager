import Link from "next/link";
import type { ReactNode } from "react";

/*
  Ansicht-Umschalter (Karten / Tabelle / Liste) — EIN Rezept. Vorher 3× von Hand
  gebaut (machines, dashboard, admin/modelle), sogar mit abweichender Aktiv-Farbe
  (Akzent vs. Primary). Der Zustand lebt weiter in der URL; die Seite liefert
  fertige hrefs + `active` je Option.
*/
export type ViewOption = {
  href: string;
  /** dient als aria-label UND title (z. B. „Kartenansicht"). */
  label: string;
  icon: ReactNode;
  active: boolean;
};

export function ViewToggle({ options }: { options: ViewOption[] }) {
  return (
    <div className="flex items-center gap-1" aria-label="Ansicht">
      {options.map((o) => (
        <Link
          key={o.label}
          href={o.href}
          aria-label={o.label}
          title={o.label}
          aria-current={o.active ? "true" : undefined}
          className={`inline-flex items-center justify-center rounded-[var(--radius)] border p-2 transition-colors ${
            o.active
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          }`}
        >
          {o.icon}
        </Link>
      ))}
    </div>
  );
}
