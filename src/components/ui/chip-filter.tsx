import Link from "next/link";

/*
  EIN Filter-Rezept für „nach Bereich/Club filtern" — vorher hatte jede Seite
  ihr eigenes Markup (Unterstrich-Tabs auf /machines, gefüllte Pillen auf
  /dashboard). Hier: durchgängige Pillen. Rein präsentativ und zustandslos —
  die Seite berechnet Optionen, Links und aktiv-Zustand und reicht sie herein.
  Dadurch funktioniert dieselbe Optik für Einfach- (genau eine aktiv) UND
  Mehrfachauswahl (mehrere aktiv). Der aktive Chip nutzt den Marken-Akzent
  (siehe --color-accent/--color-accent-fg, dark-mode-tauglich).
*/
export type ChipOption = {
  /** Stabiler Schlüssel (leer erlaubt, z. B. für „Alle"). */
  key: string;
  label: string;
  /** Optionaler Zähler in der Pille (z. B. Anzahl Maschinen). */
  count?: number;
  href: string;
  aktiv: boolean;
};

export function ChipFilter({
  label,
  ariaLabel,
  options,
}: {
  /** Optionaler Vorspann (z. B. „Bereich:"). */
  label?: string;
  ariaLabel?: string;
  options: ChipOption[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={ariaLabel}>
      {label ? (
        <span className="text-sm text-[var(--color-muted)]">{label}</span>
      ) : null}
      {options.map((o) => (
        <Link
          key={o.key || "__alle"}
          href={o.href}
          aria-pressed={o.aktiv}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
            o.aktiv
              ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
              : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          }`}
        >
          {o.label}
          {o.count != null ? (
            <span
              className={o.aktiv ? "opacity-80" : "text-[var(--color-faint)]"}
            >
              {o.count}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
