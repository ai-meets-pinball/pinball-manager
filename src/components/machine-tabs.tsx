import type { ReactNode } from "react";
import Link from "next/link";

/*
  Zweistufige Reiter-Navigation der Maschinen-Detailseite. Server-gerendert wie
  <HelpTabs>: der aktive Bereich kommt aus der URL (?bereich=<Blatt>), nicht aus
  Client-State — deep-linkbar, reload-fest, Next prefetcht die Links.

  Oben die Haupt-Gruppen (Übersicht · Betrieb · Wissensbasis), darunter — nur wenn
  die aktive Gruppe mehrere Blätter hat — eine schmale Unterreihe (Pillen). So sind
  auf dem Handy nie mehr als drei Reiter nebeneinander. Die Leiste klebt unter dem
  App-Header und bricht (wie dieser) auf volle Breite aus, während die Reiter in der
  Inhaltsspalte (max-w-5xl) bleiben.
*/
export type MachineTab = {
  key: string;
  label: string;
  href: string;
  active: boolean;
  badge?: ReactNode;
};

export function MachineTabs({
  primary,
  secondary,
}: {
  primary: MachineTab[];
  /** Blätter der aktiven Gruppe — nur gesetzt, wenn es mehr als eins gibt. */
  secondary?: MachineTab[];
}) {
  const hatUnterreihe = Boolean(secondary && secondary.length > 0);
  return (
    <div
      className={`sticky top-14 z-30 mx-[calc(50%-50vw)] bg-[var(--color-bg)]/90 backdrop-blur ${
        hatUnterreihe ? "border-b border-[var(--color-border)]" : ""
      }`}
    >
      {/* Haupt-Gruppen — Unterstrich-Reiter mit durchgehender Grundlinie. */}
      <div className="border-b border-[var(--color-border)]">
        <nav
          aria-label="Bereiche"
          className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-6"
        >
          {primary.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={`-mb-px flex flex-none items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                t.active
                  ? "border-[var(--color-primary)] text-[var(--color-fg)]"
                  : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-fg)]"
              }`}
            >
              {t.label}
              {t.badge}
            </Link>
          ))}
        </nav>
      </div>

      {/* Unterbereiche der aktiven Gruppe — als Pillen. */}
      {hatUnterreihe ? (
        <div className="mx-auto max-w-5xl px-6 py-2">
          <nav
            aria-label="Unterbereiche"
            className="flex gap-1.5 overflow-x-auto text-sm"
          >
            {secondary!.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                aria-current={t.active ? "page" : undefined}
                className={`flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 transition-colors ${
                  t.active
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                }`}
              >
                {t.label}
                {t.badge}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
