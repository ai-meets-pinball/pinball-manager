"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { ICON_BTN } from "@/components/ui/icon-button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  createPlanItem,
  deletePlanItem,
  updatePlanItem,
} from "@/db/actions/maintenance-plans";
import { INTERVALL_TYP_LABEL, intervallLabel, PRIORITAET_LABEL } from "@/lib/faelligkeit";
import {
  MAINTENANCE_INTERVALL_TYPEN,
  MAINTENANCE_PRIORITAETEN,
} from "@/lib/validators";
import type { FormState } from "@/db/actions/form-state";

/*
  Punkte eines Standard-Wartungsplans (Vorlage): eine kompakte Zeile je Punkt
  (Titel + Prioritäts-Badge, darunter Kategorie · Bauteil · Tätigkeit ·
  Intervall), rechts Stift und Papierkorb. Neu UND Ändern laufen über EINEN
  Dialog (PunktDialog); Speichern ist deaktiviert, bis sich ein Feld vom
  gespeicherten Stand unterscheidet. Änderungen propagieren serverseitig auf
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

/* Die Formularfelder eines Punkts — als Strings, damit sich der aktuelle
   Formularstand (FormData) direkt mit dem gespeicherten Punkt vergleichen lässt. */
const FELDER = [
  "titel",
  "kategorie",
  "bauteil",
  "taetigkeit",
  "prioritaet",
  "intervallTyp",
  "intervallTage",
  "intervallText",
  "beschreibung",
] as const;
type Werte = Record<(typeof FELDER)[number], string>;

function werteVon(item?: PlanItem): Werte {
  return {
    titel: item?.titel ?? "",
    kategorie: item?.kategorie ?? "",
    bauteil: item?.bauteil ?? "",
    taetigkeit: item?.taetigkeit ?? "",
    prioritaet: item?.prioritaet ?? "mittel",
    intervallTyp: item?.intervallTyp ?? "bedarf",
    intervallTage: item?.intervallTage == null ? "" : String(item.intervallTage),
    intervallText: item?.intervallText ?? "",
    beschreibung: item?.beschreibung ?? "",
  };
}

function werteAus(form: HTMLFormElement): Werte {
  const fd = new FormData(form);
  return Object.fromEntries(
    FELDER.map((f) => [f, String(fd.get(f) ?? "").trim()]),
  ) as Werte;
}

export function PlanItemRow({
  item,
  schreibbar,
}: {
  item: PlanItem;
  schreibbar: boolean;
}) {
  const [bearbeiten, setBearbeiten] = useState(false);

  const untertitel = [
    [item.kategorie, item.bauteil, item.taetigkeit].filter(Boolean).join(" · "),
    intervallLabel(item),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ListRow
      kompakt
      titleWrap
      title={
        <>
          <span className="mr-1.5">{item.titel}</span>
          <StatusBadge value={item.prioritaet} />
        </>
      }
      subtitle={untertitel}
      actions={
        schreibbar ? (
          <>
            <button
              type="button"
              onClick={() => setBearbeiten(true)}
              aria-label="Bearbeiten"
              title="Bearbeiten"
              className={ICON_BTN}
            >
              <Pencil size={14} />
            </button>
            <ActionForm action={deletePlanItem}>
              <input type="hidden" name="itemId" value={item.id} />
              <ConfirmButton
                question={`„${item.titel}“ löschen? Er verschwindet auch auf verknüpften Maschinen (Punkte mit Historie bleiben dort als eigene).`}
                confirmLabel="Ja, löschen"
                aria-label="Punkt löschen"
                title="Punkt löschen"
                className={`${ICON_BTN} hover:text-[var(--color-danger)]`}
              >
                <Trash2 size={14} />
              </ConfirmButton>
            </ActionForm>
            {bearbeiten ? (
              <PunktDialog
                ziel={{ art: "aendern", item }}
                onClose={() => setBearbeiten(false)}
              />
            ) : null}
          </>
        ) : undefined
      }
    />
  );
}

/** Kopf-Button „Punkt hinzufügen" mit dem Neu-Dialog. */
export function PlanItemCreate({ planId }: { planId: string }) {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOffen(true)}
      >
        <Plus size={14} /> Punkt hinzufügen
      </Button>
      {offen ? (
        <PunktDialog ziel={{ art: "neu", planId }} onClose={() => setOffen(false)} />
      ) : null}
    </>
  );
}

type Ziel = { art: "neu"; planId: string } | { art: "aendern"; item: PlanItem };

/*
  EIN Dialog für Neu und Ändern. Nur gemountet, solange offen (siehe
  ActionDialog). Der Formularstand wird bei jeder Änderung aus dem <form>
  gelesen und mit dem gespeicherten Punkt verglichen — so bleibt der Button
  „Speichern" aus, bis wirklich etwas anders ist; beim Anlegen, bis ein Titel
  da ist.
*/
function PunktDialog({ ziel, onClose }: { ziel: Ziel; onClose: () => void }) {
  const item = ziel.art === "aendern" ? ziel.item : undefined;
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    item ? updatePlanItem : createPlanItem,
    {},
  );
  const start = werteVon(item);
  const [aktuell, setAktuell] = useState<Werte>(start);
  const unveraendert = item
    ? FELDER.every((f) => aktuell[f] === start[f])
    : aktuell.titel === "";

  return (
    <ActionDialog onClose={onClose} ok={Boolean(state.ok)}>
      <form
        action={formAction}
        onChange={(e) => setAktuell(werteAus(e.currentTarget))}
        className="space-y-4 p-5"
      >
        <h3 className="text-base font-semibold">
          {item ? "Punkt ändern" : "Punkt hinzufügen"}
        </h3>
        {ziel.art === "neu" ? (
          <input type="hidden" name="planId" value={ziel.planId} />
        ) : (
          <input type="hidden" name="itemId" value={ziel.item.id} />
        )}

        <Field label="Titel">
          <Input name="titel" defaultValue={start.titel} required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kategorie">
            <Input name="kategorie" defaultValue={start.kategorie} />
          </Field>
          <Field label="Bauteil">
            <Input name="bauteil" defaultValue={start.bauteil} />
          </Field>
          <Field label="Tätigkeit">
            <Input
              name="taetigkeit"
              placeholder="Prüfen, Reinigen …"
              defaultValue={start.taetigkeit}
            />
          </Field>
          <Field label="Priorität">
            <Select name="prioritaet" defaultValue={start.prioritaet}>
              {MAINTENANCE_PRIORITAETEN.map((p) => (
                <option key={p} value={p}>
                  {PRIORITAET_LABEL[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Intervall-Typ">
            <Select name="intervallTyp" defaultValue={start.intervallTyp}>
              {MAINTENANCE_INTERVALL_TYPEN.map((t) => (
                <option key={t} value={t}>
                  {INTERVALL_TYP_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Intervall (Tage)">
            <Input
              name="intervallTage"
              type="number"
              min="1"
              placeholder={aktuell.intervallTyp === "zeit" ? "z. B. 30" : "—"}
              disabled={aktuell.intervallTyp !== "zeit"}
              defaultValue={start.intervallTage}
            />
          </Field>
        </div>
        <Field
          label="Intervall-Text (optional)"
          hint="Freies Label, z. B. „500 Spiele / monatlich“. Nur ein Zeitintervall ergibt Termine."
        >
          <Input name="intervallText" defaultValue={start.intervallText} />
        </Field>
        <Field label="Beschreibung">
          <Textarea name="beschreibung" rows={2} defaultValue={start.beschreibung} />
        </Field>

        <FormFeedback state={state} />
        <div className="flex justify-end gap-2">
          <DialogAbbrechen />
          <Button type="submit" size="sm" disabled={pending || unveraendert}>
            {pending ? "…" : item ? "Speichern" : "Hinzufügen"}
          </Button>
        </div>
      </form>
    </ActionDialog>
  );
}
