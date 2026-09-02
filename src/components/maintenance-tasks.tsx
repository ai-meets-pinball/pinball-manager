"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCheck, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { List, ListRow } from "@/components/ui/list";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { ActionForm } from "@/components/ui/action-form";
import { FormFeedback } from "@/components/ui/form-feedback";
import { ICON_BTN } from "@/components/ui/icon-button";
import { Field, Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { MaintenanceCompleteButton } from "@/components/maintenance-complete-button";
import {
  deleteTask,
  deleteTaskLog,
  logCompletionBulk,
} from "@/db/actions/maintenance";
import {
  faelligLabel,
  intervallLabel,
  wartungspunktGesperrt,
  type FaelligkeitsStatus,
} from "@/lib/faelligkeit";
import type { FormState } from "@/db/actions/form-state";

/*
  Wartungspunkt-Liste einer Maschine (Client) — der Reiter, an dem man am Gerät
  steht, oft am Handy. Deshalb EINE kompakte Zeile je Punkt: Titel mit Badges
  (Priorität, Standard, Fälligkeit), darunter Intervall · zuletzt · nächste,
  rechts der Haken (Erledigt-Dialog), Stift (Bearbeiten-Seite) und Papierkorb.
  Die Historie öffnet ein Textlink als Dialog. Vom Standard verwaltete Punkte
  haben Stift/Papierkorb deaktiviert MIT Grund (wartungspunktGesperrt — dieselbe
  Regel lehnt in der Action ab); Erledigen bleibt möglich.

  Dazu ein expliziter AUSWAHL-MODUS, um MEHRERE Punkte auf einmal als erledigt zu
  markieren (ein Datum, heute vorbelegt) — Muster wie die Mehrfach-Zuweisung der
  Maschinenliste (machines-board.tsx).
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

const datum = (d: Date) => d.toLocaleDateString("de-DE");

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
      {schreibbar && tasks.length > 0 ? (
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

      <List
        kompakt
        empty={
          schreibbar
            ? "Noch keine Wartungspunkte — verknüpfe einen Standard, importiere aus dem Guide oder lege eigene Punkte an."
            : "Noch keine Wartungspunkte."
        }
      >
        {tasks.map((t) => (
          <TaskZeile
            key={t.id}
            task={t}
            machineId={machineId}
            schreibbar={schreibbar}
            auswahlModus={auswahlModus}
            ausgewaehlt={auswahl.has(t.id)}
            onToggle={() => toggle(t.id)}
          />
        ))}
      </List>
    </div>
  );
}

function TaskZeile({
  task: t,
  machineId,
  schreibbar,
  auswahlModus,
  ausgewaehlt,
  onToggle,
}: {
  task: Task;
  machineId: string;
  schreibbar: boolean;
  auswahlModus: boolean;
  ausgewaehlt: boolean;
  onToggle: () => void;
}) {
  const [historie, setHistorie] = useState(false);
  const gesperrt = wartungspunktGesperrt(t);
  const faellig = faelligLabel(t.status, t.tageBisFaellig);

  const untertitel = [
    [t.kategorie, t.bauteil, t.taetigkeit].filter(Boolean).join(" · "),
    intervallLabel(t),
    t.zuletztErledigt ? `zuletzt ${datum(t.zuletztErledigt)}` : "noch nicht erledigt",
    t.status !== "kein-termin" && t.naechsteFaelligkeit
      ? `nächste ${datum(t.naechsteFaelligkeit)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ListRow
      kompakt
      titleWrap
      leading={
        schreibbar && auswahlModus ? (
          <input
            type="checkbox"
            checked={ausgewaehlt}
            onChange={onToggle}
            aria-label={`${t.titel} auswählen`}
            className="accent-[var(--color-accent)]"
          />
        ) : undefined
      }
      title={
        <>
          <span className="mr-1.5">{t.titel}</span>
          <span className="inline-flex flex-wrap items-center gap-1 align-middle">
            <StatusBadge value={t.prioritaet} />
            {t.planItemId ? <Badge tone="primary">Standard</Badge> : null}
            <Badge tone={faellig.ton}>{faellig.text}</Badge>
          </span>
        </>
      }
      subtitle={
        <>
          <span className="block truncate">{untertitel}</span>
          {t.beschreibung ? (
            <span className="block truncate">{t.beschreibung}</span>
          ) : null}
        </>
      }
      meta={
        <>
          <button
            type="button"
            onClick={() => setHistorie(true)}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:underline"
          >
            Historie ({t.logs.length})
          </button>
          {historie ? (
            <HistorieDialog
              task={t}
              machineId={machineId}
              schreibbar={schreibbar}
              onClose={() => setHistorie(false)}
            />
          ) : null}
        </>
      }
      /* Einzel-Aktionen nur außerhalb des Auswahl-Modus (im Modus zählt die
         Sammel-Leiste oben). */
      actions={
        schreibbar && !auswahlModus ? (
          <>
            <MaintenanceCompleteButton
              machineId={machineId}
              taskId={t.id}
              titel={t.titel}
            />
            {gesperrt ? (
              <button
                type="button"
                disabled
                aria-label={`${t.titel} bearbeiten`}
                title={gesperrt}
                className={ICON_BTN}
              >
                <Pencil size={14} />
              </button>
            ) : (
              <Link
                href={`/machines/${machineId}/maintenance/${t.id}/edit`}
                aria-label={`${t.titel} bearbeiten`}
                title="Bearbeiten"
                className={ICON_BTN}
              >
                <Pencil size={14} />
              </Link>
            )}
            <ActionForm action={deleteTask}>
              <input type="hidden" name="machineId" value={machineId} />
              <input type="hidden" name="id" value={t.id} />
              <ConfirmButton
                question={`„${t.titel}“ löschen? Die Historie dieses Punkts geht mit verloren.`}
                confirmLabel="Ja, löschen"
                disabled={gesperrt !== null}
                aria-label={`${t.titel} löschen`}
                title={gesperrt ?? "Löschen"}
                className={`${ICON_BTN} hover:text-[var(--color-danger)]`}
              >
                <Trash2 size={14} />
              </ConfirmButton>
            </ActionForm>
          </>
        ) : undefined
      }
    />
  );
}

/*
  Historie eines Punkts als Dialog (nur Anzeige + Papierkorb je Eintrag). Die
  volle Beschreibung steht hier ebenfalls — in der Zeile ist sie nur eine
  abgeschnittene Vorschau. Kein `ok`: der Dialog bleibt offen, die Liste kommt
  nach einem Löschen per revalidatePath frisch.
*/
function HistorieDialog({
  task: t,
  machineId,
  schreibbar,
  onClose,
}: {
  task: Task;
  machineId: string;
  schreibbar: boolean;
  onClose: () => void;
}) {
  return (
    <ActionDialog onClose={onClose}>
      <div className="space-y-4 p-5">
        <div>
          <h3 className="text-base font-semibold">Historie</h3>
          <p className="text-sm text-[var(--color-muted)]">{t.titel}</p>
        </div>
        {t.beschreibung ? (
          <p className="whitespace-pre-line break-words text-sm">
            {t.beschreibung}
          </p>
        ) : null}
        {t.logs.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            Noch keine Erledigung eingetragen.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {t.logs.map((l) => (
              <li key={l.id} className="flex items-center gap-2 py-1.5 text-sm">
                <span className="font-mono text-xs text-[var(--color-faint)]">
                  {datum(l.datum)}
                </span>
                <span className="min-w-0 flex-1 break-words">{l.notiz}</span>
                {schreibbar ? (
                  <ActionForm action={deleteTaskLog}>
                    <input type="hidden" name="machineId" value={machineId} />
                    <input type="hidden" name="taskId" value={t.id} />
                    <input type="hidden" name="logId" value={l.id} />
                    <ConfirmButton
                      question="Diesen Historien-Eintrag löschen? Die Fälligkeit wird aus den verbleibenden Einträgen neu berechnet."
                      confirmLabel="Ja, löschen"
                      aria-label="Eintrag löschen"
                      title="Eintrag löschen"
                      className={`${ICON_BTN} hover:text-[var(--color-danger)]`}
                    >
                      <Trash2 size={14} />
                    </ConfirmButton>
                  </ActionForm>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <DialogAbbrechen>Schließen</DialogAbbrechen>
        </div>
      </div>
    </ActionDialog>
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
  const heute = new Date().toLocaleDateString("en-CA");

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
        <Button type="submit" size="sm" disabled={pending || taskIds.length === 0}>
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
      <FormFeedback state={state} />
    </form>
  );
}
