"use client";

import { Share2, X } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import type { FormState } from "@/db/actions/clubs";
import { shareRepair, unshareRepair } from "@/db/actions/shares";
import type { ShareDefaults } from "@/lib/share-defaults";
import {
  SCOPE_HINWEIS,
  SCOPE_LABEL,
  SHARE_SCOPES,
  type ShareScope,
} from "@/lib/sharing";

/*
  Teilen-Schalter je Reparatur. Als <details> gebaut, damit die Reparaturliste
  nicht von N offenen Formularen zugestellt wird.

  Die Vorschau ist bewusst Teil des Dialogs: diagnose/massnahme/teile sind
  unvalidierte Freitexte, in denen erfahrungsgemäß Techniker- und Händlernamen
  stehen. Wer teilt, soll vorher sehen, was andere lesen.
*/
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
  vorschau: {
    diagnose: string | null;
    massnahme: string | null;
    teile: string | null;
    kosten: string | null;
    zeit: number | null;
  };
  aktuell: { scope: string; anonym: boolean; zeigeKosten: boolean } | null;
  defaults: ShareDefaults;
  clubs: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    shareRepair,
    {},
  );
  const [scope, setScope] = useState<ShareScope>(
    (aktuell?.scope as ShareScope) ?? defaults.defaultScope,
  );
  const [anonym, setAnonym] = useState(aktuell?.anonym ?? defaults.defaultAnonym);
  const [zeigeKosten, setZeigeKosten] = useState(
    aktuell?.zeigeKosten ?? defaults.defaultZeigeKosten,
  );
  const [clubIds, setClubIds] = useState<string[]>([]);

  return (
    <details className="mt-2 border-t border-[var(--color-border)] pt-2">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]">
        <Share2 size={13} />
        {aktuell ? "Geteilt — ändern" : "Teilen"}
      </summary>

      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="machineId" value={machineId} />
        <input type="hidden" name="repairId" value={repairId} />
        <input type="hidden" name="clubIds" value={clubIds.join(",")} />

        <Field label="Sichtbar für" hint={SCOPE_HINWEIS[scope]}>
          <Select
            name="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as ShareScope)}
          >
            {SHARE_SCOPES.map((s) => (
              <option key={s} value={s}>
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
            <Input name="emails" placeholder="anna@example.com" />
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
        <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-xs">
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

        {state.error ? (
          <p className="text-xs text-[var(--color-danger)]">{state.error}</p>
        ) : null}
        {state.message ? (
          <p className="text-xs text-[var(--color-success)]">{state.message}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Speichern…" : aktuell ? "Ändern" : "Teilen"}
          </Button>
        </div>
      </form>

      {aktuell ? (
        <form action={unshareRepair} className="mt-2">
          <input type="hidden" name="machineId" value={machineId} />
          <input type="hidden" name="repairId" value={repairId} />
          <button
            type="submit"
            className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
          >
            <X size={13} /> Freigabe aufheben
          </button>
        </form>
      ) : null}
    </details>
  );
}
