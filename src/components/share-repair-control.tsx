"use client";

import { Share2, X } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { ICON_BTN } from "@/components/ui/icon-button";
import { Field, Input, Select } from "@/components/ui/input";
import type { FormState } from "@/db/actions/form-state";
import { shareRepair, unshareRepair } from "@/db/actions/shares";
import type { ShareDefaults } from "@/lib/share-defaults";
import {
  emailsAusText,
  freigabeUnveraendert,
  freigabeZielFehlt,
  SCOPE_HINWEIS,
  SCOPE_LABEL,
  SHARE_SCOPES,
  type ShareScope,
} from "@/lib/sharing";

/*
  Teilen je Reparatur: ein Icon in der Zeile öffnet den Dialog (natives
  <dialog>, ActionDialog). Vorher stand je Reparatur ein <details> mit dem
  ganzen Formular in der Liste — jetzt bleibt die Zeile schmal, und ob eine
  Reparatur geteilt ist, zeigt der Chip „Geteilt: …" (RepairList).

  Die Vorschau ist bewusst Teil des Dialogs: diagnose/massnahme/teile sind
  unvalidierte Freitexte, in denen erfahrungsgemäß Techniker- und Händlernamen
  stehen. Wer teilt, soll vorher sehen, was andere lesen.

  Speichern ist deaktiviert, bis der Entwurf von der gespeicherten Freigabe
  abweicht UND ein Ziel hat — dieselben reinen Regeln (freigabeUnveraendert,
  freigabeZielFehlt) prüft die Action. „Freigabe aufheben" fragt nach (die
  Folge im Klartext) und schließt den Dialog bei Erfolg.
*/

type Freigabe = {
  scope: string;
  anonym: boolean;
  zeigeKosten: boolean;
  clubIds: string[];
  emails: string[];
};

type Vorschau = {
  diagnose: string | null;
  massnahme: string | null;
  teile: string | null;
  kosten: string | null;
  zeit: number | null;
};

export function ShareRepairControl({
  machineId,
  repairId,
  vorschau,
  aktuell,
  defaults,
  clubs,
}: {
  machineId: string;
  repairId: string;
  vorschau: Vorschau;
  aktuell: Freigabe | null;
  defaults: ShareDefaults;
  clubs: { id: string; name: string }[];
}) {
  const [offen, setOffen] = useState(false);
  const titel = aktuell ? "Freigabe ändern" : "Teilen";
  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        aria-label={aktuell ? "Freigabe der Reparatur ändern" : "Reparatur teilen"}
        title={titel}
        className={ICON_BTN}
      >
        <Share2 size={14} />
      </button>
      {offen ? (
        <TeilenDialog
          machineId={machineId}
          repairId={repairId}
          vorschau={vorschau}
          aktuell={aktuell}
          defaults={defaults}
          clubs={clubs}
          onClose={() => setOffen(false)}
        />
      ) : null}
    </>
  );
}

/*
  Nur gemountet, solange offen (siehe ActionDialog): jede Öffnung startet mit
  dem gespeicherten Stand; Erfolg von Teilen ODER Aufheben schließt.
*/
function TeilenDialog({
  machineId,
  repairId,
  vorschau,
  aktuell,
  defaults,
  clubs,
  onClose,
}: {
  machineId: string;
  repairId: string;
  vorschau: Vorschau;
  aktuell: Freigabe | null;
  defaults: ShareDefaults;
  clubs: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    shareRepair,
    {},
  );
  const [aufheben, aufhebenAction] = useActionState<FormState, FormData>(
    unshareRepair,
    {},
  );
  // Der Speichern-Knopf steht im Dialog-Fuß neben dem Aufheben-Formular, also
  // außerhalb des Teilen-<form> — das `form`-Attribut verbindet ihn wieder.
  const formId = useId();

  const keinClub = clubs.length === 0;
  const [scope, setScope] = useState<ShareScope>(
    (aktuell?.scope as ShareScope) ?? defaults.defaultScope,
  );
  const [anonym, setAnonym] = useState(aktuell?.anonym ?? defaults.defaultAnonym);
  const [zeigeKosten, setZeigeKosten] = useState(
    aktuell?.zeigeKosten ?? defaults.defaultZeigeKosten,
  );
  // Bestehende Ziele vorbelegen — sonst verliert „Ändern" die Clubs/Personen.
  const [clubIds, setClubIds] = useState<string[]>(aktuell?.clubIds ?? []);
  const [emailsText, setEmailsText] = useState(aktuell?.emails.join(", ") ?? "");

  const entwurf = {
    scope,
    anonym,
    zeigeKosten,
    clubIds,
    emails: emailsAusText(emailsText),
  };
  const zielFehlt = freigabeZielFehlt(entwurf);
  const unveraendert =
    aktuell !== null &&
    freigabeUnveraendert(
      { ...aktuell, scope: aktuell.scope as ShareScope },
      entwurf,
    );
  const gesperrt = zielFehlt ?? (unveraendert ? "Nichts geändert" : null);

  return (
    <ActionDialog onClose={onClose} ok={Boolean(state.ok || aufheben.ok)}>
      <div className="max-h-[85vh] space-y-4 overflow-y-auto p-5">
        <h3 className="text-base font-semibold">
          {aktuell ? "Freigabe ändern" : "Reparatur teilen"}
        </h3>

        <form id={formId} action={formAction} className="space-y-3">
          <input type="hidden" name="machineId" value={machineId} />
          <input type="hidden" name="repairId" value={repairId} />
          <input type="hidden" name="clubIds" value={clubIds.join(",")} />

          <Field
            label="Sichtbar für"
            hint={
              keinClub
                ? `${SCOPE_HINWEIS[scope]} „${SCOPE_LABEL.club}" steht nicht zur Wahl, weil du in keinem Club bist.`
                : SCOPE_HINWEIS[scope]
            }
          >
            <Select
              name="scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as ShareScope)}
            >
              {SHARE_SCOPES.map((s) => (
                <option key={s} value={s} disabled={s === "club" && keinClub}>
                  {SCOPE_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>

          {scope === "club" ? (
            <div className="flex flex-wrap gap-1.5">
              {clubs.map((c) => {
                const an = clubIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={an}
                    onClick={() =>
                      setClubIds((ids) =>
                        an ? ids.filter((i) => i !== c.id) : [...ids, c.id],
                      )
                    }
                    className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                      an
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                        : "border-[var(--color-border)] text-[var(--color-muted)]"
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          ) : null}

          {scope === "users" ? (
            <Field label="E-Mail-Adressen" hint="Kommagetrennt.">
              <Input
                name="emails"
                placeholder="anna@example.com"
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
              />
            </Field>
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="anonym"
              checked={anonym}
              onChange={(e) => setAnonym(e.target.checked)}
              className="h-4 w-4"
            />
            Anonym (mein Name wird nicht angezeigt)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="zeigeKosten"
              checked={zeigeKosten}
              onChange={(e) => setZeigeKosten(e.target.checked)}
              className="h-4 w-4"
            />
            Kosten und Aufwand mitteilen
          </label>

          {/* Vorschau: exakt das, was andere sehen. */}
          <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2.5 text-xs">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.5px] text-[var(--color-faint)]">
              Das sehen andere
            </p>
            <p className="text-[var(--color-muted)]">
              Herkunft: {anonym ? "anonym" : "dein Name"}
            </p>
            {vorschau.diagnose ? <p>Diagnose: {vorschau.diagnose}</p> : null}
            {vorschau.massnahme ? <p>Maßnahme: {vorschau.massnahme}</p> : null}
            {vorschau.teile ? <p>Teile: {vorschau.teile}</p> : null}
            <p className="text-[var(--color-muted)]">
              Kosten/Aufwand:{" "}
              {zeigeKosten
                ? `${vorschau.kosten ?? "–"} € · ${vorschau.zeit ?? "–"} Min.`
                : "wird nicht angezeigt"}
            </p>
          </div>

          <FormFeedback state={state} />
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {aktuell ? (
            <form action={aufhebenAction} className="flex items-center gap-2">
              <input type="hidden" name="machineId" value={machineId} />
              <input type="hidden" name="repairId" value={repairId} />
              <ConfirmButton
                question="Freigabe aufheben? Andere Besitzer sehen diese Reparatur dann nicht mehr."
                confirmLabel="Ja, aufheben"
              >
                <X size={13} /> Freigabe aufheben
              </ConfirmButton>
              <FormFeedback state={aufheben} />
            </form>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <DialogAbbrechen />
            <Button
              type="submit"
              form={formId}
              size="sm"
              disabled={pending || gesperrt !== null}
              title={gesperrt ?? undefined}
            >
              {pending ? "…" : aktuell ? "Speichern" : "Teilen"}
            </Button>
          </div>
        </div>
      </div>
    </ActionDialog>
  );
}
