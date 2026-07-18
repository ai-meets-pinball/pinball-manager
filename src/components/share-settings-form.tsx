"use client";

import { RotateCcw, Save } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import type { FormState } from "@/db/actions/clubs";
import {
  resetShareSettings,
  saveShareSettings,
} from "@/db/actions/settings";
import type { ShareDefaults } from "@/lib/share-defaults";
import { SCOPE_HINWEIS, SCOPE_LABEL, SHARE_SCOPES, type ShareScope } from "@/lib/sharing";

/*
  Voreinstellungen fürs Teilen — für das eigene Konto oder (mit clubId) für
  einen Club. Sie belegen den Teilen-Dialog vor; im Einzelfall bleibt alles
  übersteuerbar.
*/
export function ShareSettingsForm({
  werte,
  angepasst,
  clubId,
}: {
  werte: ShareDefaults;
  angepasst: boolean;
  clubId?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveShareSettings,
    {},
  );
  const [scope, setScope] = useState<ShareScope>(werte.defaultScope);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-[var(--color-muted)]">
          {clubId
            ? "Gilt für Maschinen, die diesem Club zugeordnet sind."
            : "Gilt für deine eigenen Maschinen ohne Club-Zuordnung."}
        </p>
        <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-[var(--color-faint)]">
          {angepasst ? "angepasst" : "Standard"}
        </span>
      </div>

      <form action={formAction} className="space-y-3">
        {clubId ? <input type="hidden" name="clubId" value={clubId} /> : null}

        <Field label="Standard-Reichweite" hint={SCOPE_HINWEIS[scope]}>
          <Select
            name="defaultScope"
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

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="defaultAnonym"
            defaultChecked={werte.defaultAnonym}
            className="h-4 w-4"
          />
          Standardmäßig anonym teilen
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="defaultZeigeKosten"
            defaultChecked={werte.defaultZeigeKosten}
            className="h-4 w-4"
          />
          Kosten und Aufwand standardmäßig mitteilen
        </label>

        <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
          <p className="text-xs font-medium text-[var(--color-muted)]">
            Automatisch teilen
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="autoShareFacts"
              defaultChecked={werte.autoShareFacts}
              className="h-4 w-4"
            />
            Handbuch-Daten nach der Auswertung automatisch freigeben
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="autoShareRepairs"
              defaultChecked={werte.autoShareRepairs}
              className="h-4 w-4"
            />
            Neue Reparaturen automatisch freigeben
          </label>
        </div>

        {state.error ? (
          <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
        ) : null}
        {state.message ? (
          <p className="text-sm text-[var(--color-success)]">{state.message}</p>
        ) : null}

        <Button type="submit" disabled={pending}>
          <Save size={16} /> {pending ? "Speichern…" : "Speichern"}
        </Button>
      </form>

      {angepasst ? (
        <form action={resetShareSettings}>
          {clubId ? <input type="hidden" name="clubId" value={clubId} /> : null}
          <button
            type="submit"
            className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          >
            <RotateCcw size={13} /> Auf Standard zurücksetzen
          </button>
        </form>
      ) : null}
    </div>
  );
}
