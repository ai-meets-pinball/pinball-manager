"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { setKnowledgeVisibility } from "@/db/actions/knowledge";
import type { FormState } from "@/db/actions/form-state";

type Sicht = "privat" | "club" | "oeffentlich";

/*
  Sichtbarkeit eines eigenen Wissenseintrags ändern (privat ⇄ öffentlich; ein
  bestehender Club-Wert bleibt wählbar). Ersetzt das frühere „Fakten teilen".
  Kleine, reversible Wahl → das Auswahlfeld speichert beim Ändern (P2), ohne
  eigenen Knopf; es ist die EINE Stelle im Kopf, die die Sichtbarkeit zeigt.

  Das Feld ist GESTEUERT: es zeigt sofort den gewählten Wert, nicht erst nach
  dem Neuladen. Zwei Sackgassen auf dem Weg dorthin, damit sie niemand
  wiederholt:
  - `defaultValue` (vorher): im DOM blieb stehen, was der Nutzer geklickt hatte,
    AUCH wenn die Action scheiterte — das Feld behauptete eine Sichtbarkeit,
    die nie gespeichert wurde.
  - `useOptimistic`: fällt am ENDE der Transition auf `current` zurück, also
    bevor die aufgefrischten Serverdaten da sind → sichtbares Zurückspringen.
  - GESTEUERT (`value=…`) allein reicht auch nicht: React 19 setzt das Formular
    nach einer Action automatisch zurück. Der Reset stellt den Anfangswert im
    DOM wieder her, Reacts interner Wert stimmt danach scheinbar überein — und
    das Feld bleibt auf dem ALTEN Wert stehen, obwohl gerendert „öffentlich"
    dasteht. Genau das war der Bug „ändert sich erst nach Neuladen".

  Lösung: UNGESTEUERT mit `defaultValue` (den Reset stellt es damit korrekt auf
  die Auswahl zurück) plus `key` — ändert sich der Serverwert ODER kommt ein
  Fehler, wird das Feld neu montiert und zeigt wieder die Wahrheit.
*/
export function SetVisibility({
  knowledgeId,
  machineId,
  current,
}: {
  knowledgeId: string;
  machineId: string;
  current: Sicht;
}) {
  const [gewaehlt, setzeGewaehlt] = useState<Sicht>(current);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      // KEIN router.refresh(): die Action revalidiert bereits beide Pfade,
      // Next liefert den frischen Baum mit der Action-Antwort. Ein zusätzliches
      // refresh() lief dem hinterher und spielte einen älteren Stand ein.
      return setKnowledgeVisibility(prev, fd);
    },
    {},
  );
  // Scheitert die Action, gilt wieder der Server-Wert — ohne Effekt, ohne
  // zweiten Zustand: die Anzeige leitet sich aus beidem ab.
  const gezeigt = state.error ? current : gewaehlt;

  return (
    <form action={formAction} className="flex items-center gap-1.5 text-xs">
      <input type="hidden" name="id" value={knowledgeId} />
      <input type="hidden" name="machineId" value={machineId} />
      <label className="flex items-center gap-1.5">
        <span className="text-[var(--color-muted)]">Sichtbar:</span>
        <select
          key={`${current}|${state.error ?? ""}`}
          name="visibility"
          defaultValue={gezeigt}
          disabled={pending}
          onChange={(e) => {
            setzeGewaehlt(e.currentTarget.value as Sicht);
            e.currentTarget.form?.requestSubmit();
          }}
          className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 disabled:opacity-50"
        >
          <option value="privat">privat</option>
          <option value="oeffentlich">öffentlich</option>
          {/* „Club" nur zeigen, wenn der Eintrag dort hängt — sonst wäre es
              eine Wahl, die die Action gar nicht annimmt. */}
          {current === "club" || gezeigt === "club" ? (
            <option value="club">Club</option>
          ) : null}
        </select>
      </label>
      {pending ? (
        <Loader2 size={13} className="animate-spin text-[var(--color-muted)]" />
      ) : null}
      {state.error ? (
        <span className="text-[var(--color-danger)]">{state.error}</span>
      ) : null}
    </form>
  );
}
