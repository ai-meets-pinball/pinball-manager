import Link from "next/link";
import { LinkIcon, Pencil, Trash2 } from "lucide-react";
import { ShareRepairControl } from "@/components/share-repair-control";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteRepair } from "@/db/actions/repairs";
import type { ShareDefaults } from "@/lib/share-defaults";

type Repair = {
  id: string;
  datum: Date;
  diagnose: string | null;
  massnahme: string | null;
  teile: string | null;
  kosten: string | null;
  zeit: number | null;
  status: string;
  fault: { beschreibung: string } | null;
};

/* Optional: Teilen-Schalter je Reparatur. Bewusst als reine Daten übergeben
   (keine Render-Funktion), damit diese Server-Komponente die Client-Komponente
   ShareRepairControl selbst rendern kann. */
type TeilenProps = {
  clubs: { id: string; name: string }[];
  defaults: ShareDefaults;
  shares: Record<
    string,
    { scope: string; anonym: boolean; zeigeKosten: boolean }
  >;
};

export function RepairList({
  repairs,
  machineId,
  teilen,
}: {
  repairs: Repair[];
  machineId: string;
  teilen?: TeilenProps;
}) {
  if (repairs.length === 0) {
    return (
      <p className="text-[var(--color-muted)]">Keine Reparaturen erfasst.</p>
    );
  }

  return (
    <div className="space-y-3">
      {repairs.map((repair) => (
        <Card key={repair.id} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={repair.status} />
            {repair.fault ? (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)]">
                <LinkIcon size={12} />
                {repair.fault.beschreibung.slice(0, 40)}
              </span>
            ) : null}
            <span className="ml-auto text-xs text-[var(--color-muted)]">
              {repair.datum.toLocaleDateString("de-DE")}
            </span>
          </div>

          {repair.diagnose ? (
            <p>
              <span className="text-xs font-medium text-[var(--color-muted)]">
                Diagnose:{" "}
              </span>
              {repair.diagnose}
            </p>
          ) : null}
          {repair.massnahme ? (
            <p>
              <span className="text-xs font-medium text-[var(--color-muted)]">
                Maßnahme:{" "}
              </span>
              {repair.massnahme}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-4 text-xs text-[var(--color-muted)]">
            {repair.teile ? <span>Teile: {repair.teile}</span> : null}
            {repair.kosten ? <span>Kosten: {repair.kosten} €</span> : null}
            {repair.zeit != null ? <span>Zeit: {repair.zeit} min</span> : null}
          </div>

          <div className="flex gap-3 text-sm">
            <Link
              href={`/machines/${machineId}/repairs/${repair.id}/edit`}
              className="inline-flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              <Pencil size={14} /> Bearbeiten
            </Link>
            <form action={deleteRepair}>
              <input type="hidden" name="machineId" value={machineId} />
              <input type="hidden" name="id" value={repair.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-danger)]"
              >
                <Trash2 size={14} /> Löschen
              </button>
            </form>
          </div>

          {teilen ? (
            <ShareRepairControl
              machineId={machineId}
              repairId={repair.id}
              vorschau={{
                diagnose: repair.diagnose,
                massnahme: repair.massnahme,
                teile: repair.teile,
                kosten: repair.kosten,
                zeit: repair.zeit,
              }}
              aktuell={teilen.shares[repair.id] ?? null}
              defaults={teilen.defaults}
              clubs={teilen.clubs}
            />
          ) : null}
        </Card>
      ))}
    </div>
  );
}
