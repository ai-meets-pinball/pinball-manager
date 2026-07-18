"use client";

import { Globe, Share2, Users, X } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import type { FormState } from "@/db/actions/clubs";
import { shareFacts, unshareFacts } from "@/db/actions/shares";
import { SCOPE_LABEL, SHARE_SCOPES, type ShareScope } from "@/lib/sharing";

/*
  Handbuch-Fakten teilen. Die Reichweite ist die eigentliche Entscheidung —
  darum bestimmt sie, welche Zielfelder überhaupt erscheinen (Clubs bzw.
  E-Mails). Das Anonym-Flag ist bewusst voreingestellt.
*/
export function ShareFactsForm({
  machineId,
  hatModell,
  aktuell,
  clubs,
}: {
  machineId: string;
  hatModell: boolean;
  aktuell: { scope: string; anonym: boolean } | null;
  clubs: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    shareFacts,
    {},
  );
  const [scope, setScope] = useState<ShareScope>(
    (aktuell?.scope as ShareScope) ?? "platform",
  );
  const [clubIds, setClubIds] = useState<string[]>([]);

  if (!hatModell) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        Diese Maschine hat keinen OPDB-Bezug. Ohne Gerätetyp gibt es keinen
        gemeinsamen Ankerpunkt — ordne die Maschine beim Bearbeiten einem
        OPDB-Eintrag zu, dann lassen sich die Handbuch-Daten teilen.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-medium">
          <Share2 size={16} className="text-[var(--color-primary)]" />
          Handbuch-Daten teilen
        </p>
        {aktuell ? (
          <form action={unshareFacts}>
            <input type="hidden" name="machineId" value={machineId} />
            <button
              type="submit"
              className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
            >
              <X size={13} /> Freigabe aufheben
            </button>
          </form>
        ) : null}
      </div>

      <p className="text-sm text-[var(--color-muted)]">
        Andere Besitzer desselben Automaten sehen deine extrahierten Tabellen
        dann als Nur-Lese-Ansicht und sparen sich eine eigene Auswertung.
      </p>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="machineId" value={machineId} />
        <input type="hidden" name="clubIds" value={clubIds.join(",")} />

        <Field label="Sichtbar für">
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
          <Field
            label="Clubs"
            hint={
              clubs.length === 0
                ? "Du bist in keinem Club."
                : "Mehrfachauswahl per Klick."
            }
          >
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
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                      an
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                        : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                    }`}
                  >
                    <Users size={12} /> {c.name}
                  </button>
                );
              })}
            </div>
          </Field>
        ) : null}

        {scope === "users" ? (
          <Field
            label="E-Mail-Adressen"
            hint="Kommagetrennt. Die Konten müssen existieren."
          >
            <Input name="emails" placeholder="anna@example.com, ben@example.com" />
          </Field>
        ) : null}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="anonym"
            defaultChecked={aktuell?.anonym ?? true}
            className="h-4 w-4"
          />
          Anonym teilen (mein Name wird nicht angezeigt)
        </label>

        {state.error ? (
          <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
        ) : null}
        {state.message ? (
          <p className="text-sm text-[var(--color-success)]">{state.message}</p>
        ) : null}

        <Button type="submit" disabled={pending}>
          <Globe size={16} />{" "}
          {pending ? "Speichern…" : aktuell ? "Freigabe ändern" : "Teilen"}
        </Button>
      </form>
    </div>
  );
}
