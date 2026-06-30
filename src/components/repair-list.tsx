import Link from "next/link";
import { LinkIcon, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteRepair } from "@/db/actions/repairs";

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

export function RepairList({
  repairs,
  machineId,
}: {
  repairs: Repair[];
  machineId: string;
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
                className="inline-flex items-center gap-1 text-[var(--color-muted)] hover:text-red-600"
              >
                <Trash2 size={14} /> Löschen
              </button>
            </form>
          </div>
        </Card>
      ))}
    </div>
  );
}
