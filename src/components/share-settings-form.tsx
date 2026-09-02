"use client";

import { RotateCcw, Save } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Field, Select } from "@/components/ui/input";
import type { FormState } from "@/db/actions/form-state";
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

  Speichern ist erst aktiv, wenn ein Wert vom gespeicherten Stand abweicht.
  Die Felder werden über `key` neu aufgesetzt, sobald der gespeicherte Stand
  wechselt (nach Speichern oder Zurücksetzen) — sonst zeigte das Formular nach
  „Auf Standard zurücksetzen" weiter die alten Werte. Der useActionState bleibt
  außen, damit die Rückmeldung den Neuaufbau überlebt.
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

      <Felder
        key={JSON.stringify(werte)}
        werte={werte}
        clubId={clubId}
        formAction={formAction}
        pending={pending}
      />

      <FormFeedback state={state} />

      {angepasst ? (
        <form action={resetShareSettings}>
          {clubId ? <input type="hidden" name="clubId" value={clubId} /> : null}
          <ConfirmButton
            question="Auf Standard zurücksetzen? Deine angepassten Voreinstellungen gehen verloren."
            confirmLabel="Ja, zurücksetzen"
            className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          >
            <RotateCcw size={13} /> Auf Standard zurücksetzen
          </ConfirmButton>
        </form>
      ) : null}
    </div>
  );
}

function Felder({
  werte,
  clubId,
  formAction,
  pending,
}: {
  werte: ShareDefaults;
  clubId?: string;
  formAction: (formData: FormData) => void;
  pending: boolean;
}) {
  const [w, setW] = useState<ShareDefaults>(werte);
  const unveraendert = (Object.keys(werte) as (keyof ShareDefaults)[]).every(
    (k) => w[k] === werte[k],
  );
  const haken = (name: keyof ShareDefaults, label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        checked={Boolean(w[name])}
        onChange={(e) => setW({ ...w, [name]: e.target.checked })}
        className="h-4 w-4"
      />
      {label}
    </label>
  );

  return (
    <form action={formAction} className="space-y-3">
      {clubId ? <input type="hidden" name="clubId" value={clubId} /> : null}

      <Field label="Standard-Reichweite" hint={SCOPE_HINWEIS[w.defaultScope]}>
        <Select
          name="defaultScope"
          value={w.defaultScope}
          onChange={(e) =>
            setW({ ...w, defaultScope: e.target.value as ShareScope })
          }
        >
          {SHARE_SCOPES.map((s) => (
            <option key={s} value={s}>
              {SCOPE_LABEL[s]}
            </option>
          ))}
        </Select>
      </Field>

      {haken("defaultAnonym", "Standardmäßig anonym teilen")}
      {haken("defaultZeigeKosten", "Kosten und Aufwand standardmäßig mitteilen")}

      <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
        <p className="text-xs font-medium text-[var(--color-muted)]">
          Automatisch teilen
        </p>
        {haken("autoShareFacts", "Handbuch-Daten nach der Auswertung automatisch freigeben")}
        {haken("autoShareRepairs", "Neue Reparaturen automatisch freigeben")}
      </div>

      <Button type="submit" disabled={pending || unveraendert}>
        <Save size={16} /> {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
