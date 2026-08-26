import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { QuelleBadge } from "@/components/ui/quelle-badge";

/*
  Kompakte „Offene Fehler"-Vorschau auf dem Übersichts-Reiter (Dashboard-Optik):
  die neuesten offenen Fehler mit Priorität, Status, Zeit und Melder — plus ein
  Link in die volle Fehlerliste. Die Daten kommen aus getMachineFaults(nurOffen).
*/
type Zeile = {
  id: string;
  beschreibung: string;
  prioritaet: string;
  status: string;
  datum: Date;
  melderName: string | null;
  quelle?: string | null;
};

export function MachineFaultsPreview({
  machineId,
  faults,
}: {
  machineId: string;
  faults: Zeile[];
}) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Offene Fehler</h3>
        <Link
          href={`/machines/${machineId}?bereich=fehler`}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
        >
          Alle Fehler anzeigen <ChevronRight size={15} />
        </Link>
      </div>

      {faults.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">Keine offenen Fehler.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-muted)]">
                <th className="pb-2 pr-3 font-medium">Fehlermeldung</th>
                <th className="pb-2 pr-3 font-medium">Priorität</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Zeit</th>
                <th className="pb-2 font-medium">Gemeldet von</th>
              </tr>
            </thead>
            <tbody>
              {faults.map((f) => (
                <tr
                  key={f.id}
                  className="border-t border-[var(--color-border)]"
                >
                  <td className="py-2 pr-3">{f.beschreibung}</td>
                  <td className="py-2 pr-3">
                    <StatusBadge value={f.prioritaet} />
                  </td>
                  <td className="py-2 pr-3">
                    <StatusBadge value={f.status} />
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap text-[var(--color-muted)]">
                    {f.datum.toLocaleDateString("de-DE")}
                  </td>
                  <td className="py-2 whitespace-nowrap text-[var(--color-muted)]">
                    <span className="inline-flex items-center gap-1.5">
                      {f.melderName ?? "—"}
                      <QuelleBadge quelle={f.quelle} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
