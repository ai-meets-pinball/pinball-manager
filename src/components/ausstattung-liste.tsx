"use client";

import { useActionState, useEffect, useRef } from "react";
import { Package, Plus, X } from "lucide-react";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { addAusstattung, removeAusstattung } from "@/db/actions/ausstattung";
import type { FormState } from "@/db/actions/form-state";

/*
  Ausstattung/Add-ons im Kopf der Maschinen-Detailseite: was an genau diesem
  Gerät zusätzlich verbaut/dabei ist (Shaker, Topper, farbige LEDs …). Rein
  informativ, wie die Besitzer-Zeile daneben. Schreibberechtigte hängen Einträge
  inline an/ab (Name + optionale Notiz, keine Kategorie); Nur-Leser sehen nur die
  Liste. Ist die Liste leer und der Betrachter darf nicht bearbeiten, zeigt die
  Zeile nichts.
*/
type Eintrag = { id: string; name: string; notiz: string | null };

export function AusstattungListe({
  machineId,
  ausstattung,
  darfBearbeiten,
}: {
  machineId: string;
  ausstattung: Eintrag[];
  darfBearbeiten: boolean;
}) {
  if (!darfBearbeiten && ausstattung.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-muted)]">
      <span className="inline-flex items-center gap-1">
        <Package size={14} /> Ausstattung:
      </span>

      {ausstattung.length === 0 ? (
        <span>—</span>
      ) : (
        ausstattung.map((a) => (
          <span key={a.id} className="inline-flex items-center gap-1.5">
            <span className="text-[var(--color-fg)]">{a.name}</span>
            {a.notiz ? <span>· {a.notiz}</span> : null}
            {darfBearbeiten ? (
              <form action={removeAusstattung} className="inline-flex">
                <input type="hidden" name="machineId" value={machineId} />
                <input type="hidden" name="id" value={a.id} />
                <ConfirmButton
                  question={`„${a.name}" aus der Ausstattung entfernen?`}
                  confirmLabel="Ja, entfernen"
                  aria-label={`${a.name} entfernen`}
                >
                  <X size={13} />
                </ConfirmButton>
              </form>
            ) : null}
          </span>
        ))
      )}

      {darfBearbeiten ? <AddForm machineId={machineId} /> : null}
    </div>
  );
}

function AddForm({ machineId }: { machineId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    addAusstattung,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Nach erfolgreichem Anlegen die Felder leeren — die aktualisierte Liste kommt
  // über revalidatePath aus dem Server-Render, nicht aus diesem Formular.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const feldStil =
    "rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]";

  return (
    <form
      ref={formRef}
      action={formAction}
      className="inline-flex flex-wrap items-center gap-1.5"
    >
      <input type="hidden" name="machineId" value={machineId} />
      <input
        name="name"
        required
        maxLength={120}
        placeholder="z. B. Shaker"
        className={feldStil}
      />
      <input
        name="notiz"
        maxLength={300}
        placeholder="Notiz (optional)"
        className={feldStil}
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-60"
      >
        <Plus size={12} /> Hinzufügen
      </button>
      {state.error ? (
        <span className="text-xs text-[var(--color-danger)]">{state.error}</span>
      ) : null}
    </form>
  );
}
