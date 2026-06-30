import Link from "next/link";
import { Pencil, Trash2, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteFault } from "@/db/actions/faults";

type Fault = {
  id: string;
  beschreibung: string;
  kategorie: string | null;
  prioritaet: string;
  status: string;
  datum: Date;
};

export function FaultList({
  faults,
  machineId,
}: {
  faults: Fault[];
  machineId: string;
}) {
  if (faults.length === 0) {
    return (
      <p className="text-[var(--color-muted)]">Keine Fehler erfasst.</p>
    );
  }

  return (
    <div className="space-y-3">
      {faults.map((fault) => (
        <Card key={fault.id} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={fault.status} />
            <StatusBadge value={fault.prioritaet} />
            {fault.kategorie ? (
              <span className="text-xs text-[var(--color-muted)]">
                {fault.kategorie}
              </span>
            ) : null}
            <span className="ml-auto text-xs text-[var(--color-muted)]">
              {fault.datum.toLocaleDateString("de-DE")}
            </span>
          </div>

          <p className="whitespace-pre-wrap">{fault.beschreibung}</p>

          <div className="flex gap-3 text-sm">
            <Link
              href={`/machines/${machineId}/repairs/new?faultId=${fault.id}`}
              className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
            >
              <Wrench size={14} /> Reparatur erfassen
            </Link>
            <Link
              href={`/machines/${machineId}/faults/${fault.id}/edit`}
              className="inline-flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              <Pencil size={14} /> Bearbeiten
            </Link>
            <form action={deleteFault}>
              <input type="hidden" name="machineId" value={machineId} />
              <input type="hidden" name="id" value={fault.id} />
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
