import Link from "next/link";
import { Link2Off, ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";
import { LinkStandardForm } from "@/components/link-standard-form";
import { MaintenanceCompleteButton } from "@/components/maintenance-complete-button";
import { MaintenanceGuideImport } from "@/components/maintenance-guide-import";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AiProvider } from "@/lib/ai/provider";
import {
  applyStandardMaintenance,
  deleteTask,
  deleteTaskLog,
} from "@/db/actions/maintenance";
import { unlinkMachineFromStandard } from "@/db/actions/maintenance-plans";
import { intervallLabel, type FaelligkeitsStatus } from "@/lib/faelligkeit";

/*
  Interaktiver Wartungsplan je Gerät: Wartungspunkte mit Fälligkeit, „Erledigt"-
  Eintrag und Historie. Bei „pro Bereich" eingeklappt liegt dieser Inhalt im
  Wartungsplan-Panel (CollapsibleSection) der Detailseite.
*/

type LogEntry = { id: string; datum: Date; notiz: string | null };
type Task = {
  id: string;
  /** Gesetzt = vom verknüpften Standard verwaltet (nicht einzeln editierbar). */
  planItemId: string | null;
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
  status: FaelligkeitsStatus;
  tageBisFaellig: number | null;
  logs: LogEntry[];
};

function Chip({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
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

function DueChip({
  status,
  tage,
}: {
  status: FaelligkeitsStatus;
  tage: number | null;
}) {
  if (status === "kein-termin")
    return <Chip color="var(--color-faint)">kein Termin</Chip>;
  if (status === "faellig") {
    // „fällig" schließt den heutigen Tag ein; echt vergangene Termine heißen
    // weiterhin „überfällig" (CONTEXT.md: überfällig ist Teilmenge von fällig).
    const n = tage != null ? Math.abs(tage) : 0;
    return (
      <Chip color="var(--color-danger)">
        {n > 0 ? `überfällig (seit ${n} T.)` : "heute fällig"}
      </Chip>
    );
  }
  if (status === "bald") {
    return <Chip color="var(--color-warn)">fällig in {tage} T.</Chip>;
  }
  return (
    <Chip color="var(--color-success)">
      {tage != null ? `in ${tage} T.` : "ok"}
    </Chip>
  );
}

function meta(t: Task): string {
  return [t.kategorie, t.bauteil, t.taetigkeit].filter(Boolean).join(" · ");
}

export function MaintenancePlan({
  tasks,
  machineId,
  schreibbar,
  hatGuide,
  providers,
  centralKey,
  verknuepfterPlan,
  clubs,
}: {
  tasks: Task[];
  machineId: string;
  schreibbar: boolean;
  hatGuide: boolean;
  /** Verfügbare KI-Anbieter für „Aus Guide übernehmen" (Auswahl, wenn mehrere). */
  providers: AiProvider[];
  /** Zentraler Anthropic-Key vorhanden? Sonst BYO-Feld beim Claude-Weg. */
  centralKey: boolean;
  /** Verknüpfter Standard (oder null = eigener Plan / Kopie). */
  verknuepfterPlan: { name: string } | null;
  /** Clubs des Nutzers — Ziele fürs Verknüpfen. */
  clubs: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-3">
      {schreibbar ? (
        verknuepfterPlan ? (
          /* Verknüpft: der Standard verwaltet die Punkte — hier nur lösen,
             Standard bearbeiten oder ZUSÄTZLICHE eigene Punkte anlegen. */
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <ListChecks size={15} className="text-[var(--color-primary)]" />
              Verknüpft mit <strong>„{verknuepfterPlan.name}“</strong> —
              Änderungen am Standard wirken hier.
            </span>
            <Link
              href="/wartungsplaene"
              className="text-[var(--color-primary)] hover:underline"
            >
              Standard bearbeiten
            </Link>
            <form action={unlinkMachineFromStandard} className="ml-auto">
              <input type="hidden" name="machineId" value={machineId} />
              <ConfirmButton
                question="Verknüpfung lösen? Alle Punkte werden eigene, frei editierbare Kopien."
                confirmLabel="Ja, lösen"
              >
                <Link2Off size={13} /> Verknüpfung lösen
              </ConfirmButton>
            </form>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <LinkStandardForm machineId={machineId} clubs={clubs} />
            <form action={applyStandardMaintenance}>
              <input type="hidden" name="machineId" value={machineId} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]/40"
              >
                <ListChecks size={15} /> Standard als Kopie übernehmen
              </button>
            </form>
          </div>
        )
      ) : null}

      {schreibbar ? (
        <div className="flex flex-wrap items-start gap-3">
          {hatGuide ? (
            <MaintenanceGuideImport
              machineId={machineId}
              providers={providers}
              centralKey={centralKey}
            />
          ) : null}

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
                {t.planItemId ? (
                  <Chip color="var(--color-primary)">Standard</Chip>
                ) : null}
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

              {t.beschreibung ? (
                <p className="text-sm">{t.beschreibung}</p>
              ) : null}

              {schreibbar ? (
                <div className="space-y-2">
                  {/* Erledigt-Melden geht IMMER (auch bei Standard-Punkten —
                      der Zustand gehört der Maschine). */}
                  <MaintenanceCompleteButton
                    machineId={machineId}
                    taskId={t.id}
                  />
                  {t.planItemId ? (
                    <p className="text-xs text-[var(--color-muted)]">
                      Vom Standard verwaltet —{" "}
                      <Link
                        href="/wartungsplaene"
                        className="text-[var(--color-primary)] hover:underline"
                      >
                        im Standard bearbeiten
                      </Link>
                      .
                    </p>
                  ) : (
                    <div className="flex gap-4 text-sm">
                      <Link
                        href={`/machines/${machineId}/maintenance/${t.id}/edit`}
                        className="inline-flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                      >
                        <Pencil size={14} /> Bearbeiten
                      </Link>
                      <form action={deleteTask}>
                        <input
                          type="hidden"
                          name="machineId"
                          value={machineId}
                        />
                        <input type="hidden" name="id" value={t.id} />
                        <ConfirmButton
                          question="Wartungspunkt löschen (samt Historie)?"
                          confirmLabel="Ja, löschen"
                        >
                          <Trash2 size={14} /> Löschen
                        </ConfirmButton>
                      </form>
                    </div>
                  )}
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
                            <input
                              type="hidden"
                              name="machineId"
                              value={machineId}
                            />
                            <input type="hidden" name="taskId" value={t.id} />
                            <input type="hidden" name="logId" value={l.id} />
                            <ConfirmButton
                              question="Diesen Historien-Eintrag löschen?"
                              confirmLabel="Ja, löschen"
                              title="Eintrag löschen"
                              className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                            >
                              <X size={13} />
                            </ConfirmButton>
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
