import Link from "next/link";
import { Users } from "lucide-react";

type Machine = {
  id: string;
  hersteller: string;
  modell: string;
  baujahr: number | null;
  fotoUrl: string | null;
  club?: { name: string } | null;
};

export function MachineCard({ machine }: { machine: Machine }) {
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
      </div>
    </Link>
  );
}
