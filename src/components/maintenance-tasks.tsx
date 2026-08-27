"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCheck, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { List, ListRow } from "@/components/ui/list";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { MaintenanceCompleteButton } from "@/components/maintenance-complete-button";
import {
  deleteTask,
  deleteTaskLog,
  logCompletionBulk,
} from "@/db/actions/maintenance";
import { intervallLabel, type FaelligkeitsStatus } from "@/lib/faelligkeit";
import type { FormState } from "@/db/actions/form-state";

/*
  Wartungspunkt-Liste einer Maschine (Client): je Punkt Fälligkeit, „Erledigt"-
  Eintrag und Historie — plus ein AUSWAHL-MODUS, um MEHRERE Punkte auf einmal als
  erledigt zu markieren (ein Datum, heute vorbelegt). Muster wie die Mehrfach-
  Zuweisung der Maschinenliste (machines-board.tsx).
*/
type LogEntry = { id: string; datum: Date; notiz: string | null };
export type Task = {
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

function DueChip({
  status,
  tage,
}: {
  status: FaelligkeitsStatus;
  tage: number | null;
}) {
  if (status === "kein-termin") return <Badge tone="muted">kein Termin</Badge>;
  if (status === "faellig") {
    const n = tage != null ? Math.abs(tage) : 0;
    return (
      <Badge tone="danger">
        {n > 0 ? `überfällig (seit ${n} T.)` : "heute fällig"}
      </Badge>
    );
  }
  if (status === "bald") {
    return <Badge tone="warn">fällig in {tage} T.</Badge>;
  }
  return <Badge tone="success">{tage != null ? `in ${tage} T.` : "ok"}</Badge>;
}

function meta(t: Task): string {
  return [t.kategorie, t.bauteil, t.taetigkeit].filter(Boolean).join(" · ");
}

export function MaintenanceTasks({
  tasks,
  machineId,
  schreibbar,
}: {
  tasks: Task[];
  machineId: string;
  schreibbar: boolean;
}) {
  const [auswahlModus, setAuswahlModus] = useState(false);
  const [auswahl, setAuswahl] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setAuswahl((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const alle = auswahl.size === tasks.length && tasks.length > 0;
  const beenden = () => {
    setAuswahlModus(false);
    setAuswahl(new Set());
  };

  return (
    <div className="space-y-3">
      {schreibbar ? (
        auswahlModus ? (
          <SammelLeiste
            machineId={machineId}
            taskIds={[...auswahl]}
            alle={alle}
            onAlle={() =>
              setAuswahl(alle ? new Set() : new Set(tasks.map((t) => t.id)))
            }
            onFertig={beenden}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAuswahlModus(true)}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          >
            <CheckCheck size={15} /> Mehrere erledigen
          </button>
        )
      ) : null}

      <List empty="Noch keine Wartungspunkte.">
      {tasks.map((t) => (
        <ListRow
          key={t.id}
          leading={
            schreibbar && auswahlModus ? (
              <input
                type="checkbox"
                checked={auswahl.has(t.id)}
                onChange={() => toggle(t.id)}
                aria-label={`${t.titel} auswählen`}
                className="accent-[var(--color-accent)]"
              />
            ) : undefined
          }
          title={t.titel}
          subtitle={meta(t) || undefined}
          meta={
            <>
              <StatusBadge value={t.prioritaet} />
              {t.planItemId ? <Badge tone="primary">Standard</Badge> : null}
              <DueChip status={t.status} tage={t.tageBisFaellig} />
            </>
          }
        >
          <div className="flex flex-wrap gap-4 text-xs text-[var(--color-muted)]">
            <span>Intervall: {intervallLabel(t)}</span>
            <span>
              {t.zuletztErledigt
                ? `zuletzt: ${t.zuletztErledigt.toLocaleDateString("de-DE")}`
                : "noch nicht erledigt"}
            </span>
            {t.status !== "kein-termin" && t.naechsteFaelligkeit ? (
              <span>
                nächste: {t.naechsteFaelligkeit.toLocaleDateString("de-DE")}
              </span>
            ) : null}
          </div>

          {t.beschreibung ? (
            <p className="whitespace-pre-line break-words text-sm">
              {t.beschreibung}
            </p>
          ) : null}

          {/* Einzel-Aktionen nur außerhalb des Auswahl-Modus (im Modus zählt die
              Sammel-Leiste oben). */}
          {schreibbar && !auswahlModus ? (
            <div className="space-y-2">
              <MaintenanceCompleteButton machineId={machineId} taskId={t.id} />
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
                    <input type="hidden" name="machineId" value={machineId} />
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
                        <input type="hidden" name="machineId" value={machineId} />
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
        </ListRow>
      ))}
      </List>
    </div>
  );
}

function SammelLeiste({
  machineId,
  taskIds,
  alle,
  onAlle,
  onFertig,
}: {
  machineId: string;
  taskIds: string[];
  alle: boolean;
  onAlle: () => void;
  onFertig: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    logCompletionBulk,
    {},
  );
  const heute = new Date().toISOString().slice(0, 10);

  // Nach erfolgreichem Sammel-Eintrag den Auswahl-Modus schließen; die Liste
  // kommt per revalidatePath frisch (neue Fälligkeiten).
  useEffect(() => {
    if (state.ok) onFertig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={formAction}
      className="space-y-2 rounded-[var(--radius)] border border-[var(--color-accent)]/40 bg-[var(--color-surface-2)] p-3"
    >
      <input type="hidden" name="machineId" value={machineId} />
      {taskIds.map((id) => (
        <input key={id} type="hidden" name="taskIds" value={id} />
      ))}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Datum">
          <Input name="datum" type="date" defaultValue={heute} />
        </Field>
        <Field label="Notiz (optional)">
          <Input name="notiz" placeholder="z. B. Gummis erneuert" />
        </Field>
        <Button type="submit" disabled={pending || taskIds.length === 0}>
          {pending ? "…" : `${taskIds.length} erledigen`}
        </Button>
        <button
          type="button"
          onClick={onAlle}
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          {alle ? "Auswahl leeren" : "Alle auswählen"}
        </button>
        <button
          type="button"
          onClick={onFertig}
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          Fertig
        </button>
      </div>
      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}
    </form>
  );
}
