import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/*
  Ein-/ausklappbarer Bereich auf Basis des nativen <details>/<summary> — das im
  Projekt etablierte Idiom (vgl. account/page.tsx, shared-facts.tsx). Kein JS,
  funktioniert in Server-Komponenten; standard eingeklappt (open={false}).

  WICHTIG: Das <summary> enthält nur nicht-interaktiven Inhalt (Titel/Badge/
  Chevron). Aktions-Links/Buttons/Formulare gehören in `children` (Body) — ein
  Klick auf ein Interaktionselement im <summary> würde sonst das Panel togglen.

  `fullBleed` bricht den Bereich aus der schmalen Spalte aus und nutzt bis ~1440px
  (für die breiten Switch-/Lamp-Matrizen), wie zuvor der Handbuch-Abschnitt.
*/
export function CollapsibleSection({
  title,
  badge,
  defaultOpen = false,
  fullBleed = false,
  children,
}: {
  title: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  fullBleed?: boolean;
  children: ReactNode;
}) {
  const details = (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--color-inset)] [&::-webkit-details-marker]:hidden">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-semibold">{title}</span>
          {badge}
        </span>
        <ChevronDown
          size={18}
          className="flex-none text-[var(--color-muted)] transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-[var(--color-border)] px-4 py-4">
        {children}
      </div>
    </details>
  );

  if (!fullBleed) return details;
  return (
    <section className="mx-[calc(50%-50vw)] px-4 sm:px-6">
      <div className="mx-auto max-w-[1440px]">{details}</div>
    </section>
  );
}
