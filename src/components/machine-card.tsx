"use client";

import Link from "next/link";
import { Check, Users, Wrench } from "lucide-react";

type Machine = {
  id: string;
  hersteller: string;
  modell: string;
  baujahr: number | null;
  fotoUrl: string | null;
  club?: { name: string } | null;
};

export function MachineCard({
  machine,
  wartungFaellig = 0,
  selection,
}: {
  machine: Machine;
  /** Anzahl fälliger Wartungen — zeigt eine „needs attention"-Badge. */
  wartungFaellig?: number;
  /** Gesetzt = Auswahlmodus: die Karte wird zum Auswahl-Umschalter statt Link. */
  selection?: { selected: boolean; onToggle: () => void };
}) {
  const inner = (
    <>
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius)] bg-[var(--color-border)]/40">
        {machine.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={machine.fotoUrl}
            alt={`${machine.hersteller} ${machine.modell}`}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium">
          {machine.hersteller} {machine.modell}
        </p>
        <p className="text-sm text-[var(--color-muted)]">
          {machine.baujahr ?? "Baujahr unbekannt"}
        </p>
        {machine.club ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-muted)]">
            <Users size={12} /> {machine.club.name}
          </p>
        ) : null}
        {wartungFaellig > 0 ? (
          <p className="mt-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-danger)]">
              <Wrench size={11} /> {wartungFaellig} Wartung
              {wartungFaellig === 1 ? "" : "en"} fällig
            </span>
          </p>
        ) : null}
      </div>
    </>
  );

  // Auswahlmodus: die ganze Karte ist ein Umschalter (kein Link), mit Häkchen
  // und hervorgehobenem Rahmen für die aktuelle Auswahl.
  if (selection) {
    return (
      <button
        type="button"
        onClick={selection.onToggle}
        aria-pressed={selection.selected}
        className={`relative flex gap-4 rounded-[var(--radius)] border bg-[var(--color-surface)] p-3 text-left transition-colors ${
          selection.selected
            ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]"
            : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
        }`}
      >
        <span
          className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded border ${
            selection.selected
              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)]"
          }`}
        >
          {selection.selected ? <Check size={13} /> : null}
        </span>
        {inner}
      </button>
    );
  }

  return (
    <Link
      href={`/machines/${machine.id}`}
      className="flex gap-4 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-colors hover:border-[var(--color-primary)]"
    >
      {inner}
    </Link>
  );
}
