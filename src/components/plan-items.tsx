"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  createPlanItem,
  deletePlanItem,
  updatePlanItem,
} from "@/db/actions/maintenance-plans";
import { intervallLabel } from "@/lib/faelligkeit";
import {
  MAINTENANCE_INTERVALL_TYPEN,
  MAINTENANCE_PRIORITAETEN,
} from "@/lib/validators";
import type { FormState } from "@/db/actions/clubs";

/*
  Punkte eines Standard-Wartungsplans (Vorlage): ANZEIGEN zuerst, Bearbeiten auf
  Verlangen (Muster wie GenerationRow). Änderungen propagieren serverseitig auf
  alle verknüpften Maschinen (db/actions/maintenance-plans.ts).
*/

export type PlanItem = {
  id: string;
  titel: string;
  kategorie: string | null;
  bauteil: string | null;
  taetigkeit: string | null;
  beschreibung: string | null;
  prioritaet: string;
  intervallTyp: string;
  intervallTage: number | null;
  intervallText: string | null;
};

/** Die Feldergruppe — geteilt von Bearbeiten (Row) und Anlegen (CreateForm). */
function ItemFelder({ werte }: { werte?: Partial<PlanItem> }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Titel">
          <Input name="titel" defaultValue={werte?.titel ?? ""} required />
        </Field>
        <Field label="Kategorie">
          <Input name="kategorie" defaultValue={werte?.kategorie ?? ""} />
        </Field>
        <Field label="Bauteil">
          <Input name="bauteil" defaultValue={werte?.bauteil ?? ""} />
        </Field>
        <Field label="Tätigkeit">
          <Input name="taetigkeit" defaultValue={werte?.taetigkeit ?? ""} />
        </Field>
        <Field label="Priorität">
          <Select name="prioritaet" defaultValue={werte?.prioritaet ?? "mittel"}>
            {MAINTENANCE_PRIORITAETEN.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Intervall-Typ">
          <Select
            name="intervallTyp"
            defaultValue={werte?.intervallTyp ?? "bedarf"}
          >
            {MAINTENANCE_INTERVALL_TYPEN.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Intervall (Tage)" hint="Nur bei Typ „zeit“ — ergibt Termine.">
          <Input
            name="intervallTage"
            type="number"
            defaultValue={werte?.intervallTage ?? ""}
          />
        </Field>
        <Field
          label="Intervall-Text"
          hint="Anzeige, z. B. „500 Spiele / monatlich“."
        >
          <Input name="intervallText" defaultValue={werte?.intervallText ?? ""} />
        </Field>
      </div>
      <Field label="Beschreibung">
        <Textarea
          name="beschreibung"
          rows={2}
          defaultValue={werte?.beschreibung ?? ""}
        />
      </Field>
    </>
  );
}

export function PlanItemRow({
  item,
  schreibbar,
}: {
  item: PlanItem;
  schreibbar: boolean;
}) {
  const [bearbeiten, setBearbeiten] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updatePlanItem,
    {},
  );

  // Bei Erfolg schließen („adjust state during render", vgl. GenerationRow).
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.message) setBearbeiten(false);
  }

  const meta = [item.kategorie, item.bauteil, item.taetigkeit]
    .filter(Boolean)
    .join(" · ");

  return (
    <ListRow
      title={item.titel}
      subtitle={`${meta ? `${meta} · ` : ""}${intervallLabel(item)}`}
      meta={<StatusBadge value={item.prioritaet} />}
      actions={
        schreibbar ? (
          <>
            <button
              type="button"
              onClick={() => setBearbeiten((b) => !b)}
              aria-expanded={bearbeiten}
              aria-label="Bearbeiten"
              title="Bearbeiten"
              className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              <Pencil size={16} />
            </button>
            <form action={deletePlanItem}>
              <input type="hidden" name="itemId" value={item.id} />
              <ConfirmButton
                question="Punkt löschen? Er verschwindet auch auf verknüpften Maschinen (Punkte mit Historie bleiben dort als eigene)."
                confirmLabel="Ja, löschen"
                aria-label="Punkt löschen"
              >
                <Trash2 size={16} />
              </ConfirmButton>
            </form>
          </>
        ) : undefined
      }
    >
      {bearbeiten ? (
        <form
          action={formAction}
          className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-3"
        >
          <input type="hidden" name="itemId" value={item.id} />
          <ItemFelder werte={item} />
          <FormFeedback state={state} />
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Speichern…" : "Speichern"}
            </Button>
            <button
              type="button"
              onClick={() => setBearbeiten(false)}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              Abbrechen
            </button>
          </div>
        </form>
      ) : null}
    </ListRow>
  );
}

export function PlanItemCreate({ planId }: { planId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createPlanItem,
    {},
  );

  return (
    <details className="text-sm">
      <summary className="inline-flex cursor-pointer items-center gap-1.5 text-[var(--color-muted)] hover:text-[var(--color-fg)]">
        <Plus size={14} /> Punkt hinzufügen
      </summary>
      <form action={formAction} className="flex flex-col gap-3 pt-3">
        <input type="hidden" name="planId" value={planId} />
        <ItemFelder />
        <FormFeedback state={state} />
        <div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Anlegen…" : "Anlegen"}
          </Button>
        </div>
      </form>
    </details>
  );
}
