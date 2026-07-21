import Link from "next/link";
import { Users, Wrench } from "lucide-react";

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
}: {
  machine: Machine;
  /** Anzahl fälliger Wartungen — zeigt eine „needs attention"-Badge. */
  wartungFaellig?: number;
}) {
  return (
    <Link
      href={`/machines/${machine.id}`}
      className="flex gap-4 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-colors hover:border-[var(--color-primary)]"
    >
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
    </Link>
  );
}
