import Link from "next/link";
import { ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";
import { MaintenanceCompleteButton } from "@/components/maintenance-complete-button";
import { MaintenanceGuideImport } from "@/components/maintenance-guide-import";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  applyStandardMaintenance,
  deleteTask,
  deleteTaskLog,
} from "@/db/actions/maintenance";
import type { MaintenanceStatus } from "@/db/queries";

/*
  Interaktiver Wartungsplan je Gerät: Wartungspunkte mit Fälligkeit, „Erledigt"-
  Eintrag und Historie. Bei „pro Bereich" eingeklappt liegt dieser Inhalt im
  Wartungsplan-Panel (CollapsibleSection) der Detailseite.
*/

type LogEntry = { id: string; datum: Date; notiz: string | null };
type Task = {
  id: string;
  titel: string;
  kategorie: string | null;
  bauteil: string | null;
  taetigkeit: string | null;
  beschreibung: string | null;
  prioritaet: string;
  intervallTyp: string;
  intervallTage: number | null;
  intervallText: string | null;
  zuletztErledigt: Date | null;
  naechsteFaelligkeit: Date | null;
  status: MaintenanceStatus;
  tageBisFaellig: number | null;
  logs: LogEntry[];
};

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex rounded-[4px] px-2 py-0.5 text-[11px] font-semibold"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}

function DueChip({ status, tage }: { status: MaintenanceStatus; tage: number | null }) {
  if (status === "kein-termin") return <Chip color="var(--color-faint)">kein Termin</Chip>;
  if (status === "ueberfaellig") {
    const n = tage != null ? Math.abs(tage) : 0;
    return (
      <Chip color="var(--color-danger)">
        überfällig{n > 0 ? ` (seit ${n} T.)` : ""}
      </Chip>
    );
  }
  if (status === "bald") {
    return (
      <Chip color="var(--color-warn)">
        {tage != null && tage <= 0 ? "heute fällig" : `fällig in ${tage} T.`}
      </Chip>
    );
  }
  return (
    <Chip color="var(--color-success)">{tage != null ? `in ${tage} T.` : "ok"}</Chip>
  );
}

function intervallLabel(t: Task): string {
  if (t.intervallText) return t.intervallText;
  if (t.intervallTyp === "zeit" && t.intervallTage) return `alle ${t.intervallTage} Tage`;
  if (t.intervallTyp === "spiele") return "nach Spielzahl";
  return "bei Bedarf";
}

function meta(t: Task): string {
  return [t.kategorie, t.bauteil, t.taetigkeit].filter(Boolean).join(" · ");
}

export function MaintenancePlan({
  tasks,
  machineId,
  schreibbar,
  hatGuide,
}: {
  tasks: Task[];
  machineId: string;
  schreibbar: boolean;
  hatGuide: boolean;
}) {
  return (
    <div className="space-y-3">
      {schreibbar ? (
        <div className="flex flex-wrap items-start gap-3">
          <form action={applyStandardMaintenance}>
            <input type="hidden" name="machineId" value={machineId} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]/40"
            >
              <ListChecks size={15} /> Standard-Wartungsplan übernehmen
            </button>
          </form>

          {hatGuide ? <MaintenanceGuideImport machineId={machineId} /> : null}

          <Link
            href={`/machines/${machineId}/maintenance/new`}
            className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]/40"
          >
            <Plus size={15} /> Neuer Wartungspunkt
          </Link>
        </div>
      ) : null}

      {tasks.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          Noch keine Wartungspunkte.{" "}
          {schreibbar
            ? "Übernimm den Standard-Wartungsplan, importiere aus dem Guide oder lege eigene Punkte an."
            : ""}
        </p>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <Card key={t.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={t.prioritaet} />
                <span className="font-medium">{t.titel}</span>
                <span className="ml-auto">
                  <DueChip status={t.status} tage={t.tageBisFaellig} />
                </span>
              </div>

              {meta(t) ? (
                <p className="text-xs text-[var(--color-muted)]">{meta(t)}</p>
              ) : null}

              <div className="flex flex-wrap gap-4 text-xs text-[var(--color-muted)]">
                <span>Intervall: {intervallLabel(t)}</span>
                <span>
                  {t.zuletztErledigt
                    ? `zuletzt: ${t.zuletztErledigt.toLocaleDateString("de-DE")}`
                    : "noch nie erledigt"}
                </span>
                {t.status !== "kein-termin" && t.naechsteFaelligkeit ? (
                  <span>
                    nächste: {t.naechsteFaelligkeit.toLocaleDateString("de-DE")}
                  </span>
                ) : null}
              </div>

              {t.beschreibung ? <p className="text-sm">{t.beschreibung}</p> : null}

              {schreibbar ? (
                <div className="space-y-2">
                  <MaintenanceCompleteButton machineId={machineId} taskId={t.id} />
                  <div className="flex gap-4 text-sm">
                    <Link
                      href={`/machines/${machineId}/maintenance/${t.id}/edit`}
                      className="inline-flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                    >
                      <Pencil size={14} /> Bearbeiten
                    </Link>
                    <form action={deleteTask}>
                      <input type="hidden" name="machineId" value={machineId} />
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                      >
                        <Trash2 size={14} /> Löschen
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}

              {t.logs.length > 0 ? (
                <details className="group">
                  <summary className="cursor-pointer list-none text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)] [&::-webkit-details-marker]:hidden">
                    Historie ({t.logs.length})
                  </summary>
                  <ul className="mt-2 space-y-1 border-l border-[var(--color-border)] pl-3">
                    {t.logs.map((l) => (
                      <li
                        key={l.id}
                        className="flex flex-wrap items-center gap-2 text-xs"
                      >
                        <span className="font-mono text-[var(--color-faint)]">
                          {l.datum.toLocaleDateString("de-DE")}
                        </span>
                        {l.notiz ? <span>{l.notiz}</span> : null}
                        {schreibbar ? (
                          <form action={deleteTaskLog} className="ml-auto">
                            <input type="hidden" name="machineId" value={machineId} />
                            <input type="hidden" name="taskId" value={t.id} />
                            <input type="hidden" name="logId" value={l.id} />
                            <button
                              type="submit"
                              title="Eintrag löschen"
                              className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                            >
                              <X size={13} />
                            </button>
                          </form>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
