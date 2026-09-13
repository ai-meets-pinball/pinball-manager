"use client";

import { useActionState, useMemo, useState } from "react";
import { Layers, Lightbulb, Loader2 } from "lucide-react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { FormFeedback } from "@/components/ui/form-feedback";
import { VisibilityField } from "@/components/ui/visibility-field";
import { LinksFeld } from "@/components/links-feld";
import { createTipp } from "@/db/actions/tipps";
import { ordneTippZiele } from "@/lib/tipp-ziele";
import type { FormState } from "@/db/actions/form-state";

/*
  Neuen allgemeinen Tipp anlegen (typ='tipp') — ein Knopf „Tipp hinzufügen"
  öffnet den Dialog (natives <dialog>, nur gemountet solange offen, schließt
  bei Erfolg). Der Geltungsbereich ist n:m: beliebig viele Modelle und/oder
  Generationen aus dem Katalog.

  Die Ziel-Auswahl ist gestuft, vom Nahen zum Fernen (Redlining 2026-09-13):
  erst DIESES Gerät (vorausgewählt), dann weitere Editionen desselben Titels
  (z. B. Pro ↔ Premium/LE), dann — zugeklappt — andere Modelle, und getrennt
  davon ganze Generationen. Die Ordnung liefert lib/tipp-ziele.

  Die Auswahl lebt im Client-State und wird als hidden inputs übertragen — die
  Checkboxen selbst tragen bewusst KEINEN name: Listen sind filterbar bzw.
  zugeklappt, und unmontierte Checkboxen würden ihre Auswahl sonst still aus
  dem Submit verlieren.
*/
type Katalog = {
  machineId: string;
  modelle: {
    id: string;
    opdbRef: string | null;
    hersteller: string | null;
    modell: string;
    baujahr: number | null;
  }[];
  generationen: { id: string; name: string }[];
  vorauswahlModelId: string;
  /** OPDB-Referenz dieser Maschine — bestimmt „weitere Editionen desselben Titels". */
  eigenerOpdbRef: string | null;
  /** Generation dieses Modells (falls bekannt) — steht in der Generationen-Stufe vorn. */
  eigeneGeneration: { id: string; name: string } | null;
};

export function TippForm(props: Katalog) {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOffen(true)}
      >
        <Lightbulb size={14} /> Tipp hinzufügen
      </Button>
      {offen ? <TippDialog {...props} onClose={() => setOffen(false)} /> : null}
    </>
  );
}

const CHECK = "flex cursor-pointer items-center gap-2 text-sm";
const STUFE = "rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-2";

function TippDialog({
  machineId,
  modelle,
  generationen,
  vorauswahlModelId,
  eigenerOpdbRef,
  eigeneGeneration,
  onClose,
}: Katalog & { onClose: () => void }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createTipp,
    {},
  );
  const [titel, setTitel] = useState("");
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("");
  const [modelIds, setModelIds] = useState<Set<string>>(
    () => new Set([vorauswahlModelId]),
  );
  const [generationIds, setGenerationIds] = useState<Set<string>>(new Set());

  const stufen = useMemo(
    () =>
      ordneTippZiele(
        modelle.map((m) => ({
          id: m.id,
          opdbRef: m.opdbRef,
          label: `${m.modell}${m.hersteller ? ` · ${m.hersteller}` : ""}${m.baujahr ? ` (${m.baujahr})` : ""}`,
        })),
        { id: vorauswahlModelId, opdbRef: eigenerOpdbRef },
      ),
    [modelle, vorauswahlModelId, eigenerOpdbRef],
  );
  const f = filter.trim().toLowerCase();
  const gefilterteAndere = stufen.andere.filter(
    (m) => !f || m.label.toLowerCase().includes(f),
  );
  // Eigene Generation zuerst, dann der Rest alphabetisch (wie geliefert).
  const generationenSortiert = eigeneGeneration
    ? [
        ...generationen.filter((g) => g.id === eigeneGeneration.id),
        ...generationen.filter((g) => g.id !== eigeneGeneration.id),
      ]
    : generationen;

  function toggle(set: Set<string>, id: string): Set<string> {
    const neu = new Set(set);
    if (neu.has(id)) neu.delete(id);
    else neu.add(id);
    return neu;
  }
  const toggleModel = (id: string) => setModelIds((s) => toggle(s, id));

  const anzahlZiele = modelIds.size + generationIds.size;
  // Speichern erst, wenn alles Pflichtige da ist (Titel, Text, mind. ein Ziel).
  const unvollstaendig = !titel.trim() || !text.trim() || anzahlZiele === 0;
  // Was außerhalb der sichtbaren Stufen gewählt ist, steht in der Zusammenfassung.
  const gewaehlteAndere = stufen.andere.filter((m) => modelIds.has(m.id));

  return (
    <ActionDialog onClose={onClose} ok={Boolean(state.ok)} breit>
      <form action={formAction} className="space-y-3 p-5">
        <h3 className="text-base font-semibold">Tipp hinzufügen</h3>
        <input type="hidden" name="machineId" value={machineId} />
        {/* Die eigentliche Ziel-Auswahl (siehe Kommentar oben). */}
        {[...modelIds].map((id) => (
          <input key={id} type="hidden" name="modelle" value={id} />
        ))}
        {[...generationIds].map((id) => (
          <input key={id} type="hidden" name="generationen" value={id} />
        ))}

        <Field label="Titel">
          <Input
            name="titel"
            required
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="z. B. Flipperfinger-Gummis regelmäßig tauschen"
          />
        </Field>
        <Field
          label="Tipp"
          hint="Formatierung: **fett**, _kursiv_, Aufzählung mit Bindestrich am Zeilenanfang, [Text](https://…). URLs werden automatisch anklickbar."
        >
          <Textarea
            name="text"
            required
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Was hilft, worauf achten, was vermeiden …"
          />
        </Field>

        {/* Weiterführende Links (optional) — eigene URL + Name + Beschreibung. */}
        <LinksFeld />

        {/* Bewusst KEIN <Field> (= <label>) um den Picker: Button und
            Checkboxen in einem Label führen zu Klick-Weiterleitungen
            (gleiches Problem wie beim Feedback-Screenshot-Dropfeld). */}
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Wofür gilt der Tipp?</span>

          {/* Stufe 1: dieses Gerät. */}
          <div className={STUFE}>
            {stufen.eigenes ? (
              <label className={CHECK}>
                <input
                  type="checkbox"
                  checked={modelIds.has(stufen.eigenes.id)}
                  onChange={() => toggleModel(stufen.eigenes!.id)}
                />
                <span>
                  <span className="font-medium">Dieses Gerät</span>
                  <span className="text-[var(--color-muted)]"> — {stufen.eigenes.label}</span>
                </span>
              </label>
            ) : (
              <p className="text-[var(--color-muted)]">
                Das Modell dieser Maschine steht nicht im Katalog.
              </p>
            )}
          </div>

          {/* Stufe 2: weitere Editionen desselben Titels (Pro/Premium/LE …). */}
          {stufen.editionen.length > 0 ? (
            <div className={`${STUFE} space-y-1`}>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                Auch für weitere Editionen dieses Titels?
              </p>
              {stufen.editionen.map((m) => (
                <label key={m.id} className={CHECK}>
                  <input
                    type="checkbox"
                    checked={modelIds.has(m.id)}
                    onChange={() => toggleModel(m.id)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          ) : null}

          {/* Stufe 3: andere Modelle — zugeklappt, mit Filter. */}
          <details className={STUFE}>
            <summary className="cursor-pointer font-medium">
              Auch für andere Modelle?
              {gewaehlteAndere.length > 0 ? (
                <span className="font-normal text-[var(--color-muted)]">
                  {" "}
                  — {gewaehlteAndere.map((m) => m.label).join(", ")}
                </span>
              ) : null}
            </summary>
            <div className="mt-2 space-y-2">
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Modell suchen …"
              />
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {gefilterteAndere.map((m) => (
                  <label key={m.id} className={CHECK}>
                    <input
                      type="checkbox"
                      checked={modelIds.has(m.id)}
                      onChange={() => toggleModel(m.id)}
                    />
                    {m.label}
                  </label>
                ))}
                {gefilterteAndere.length === 0 ? (
                  <p className="text-[var(--color-muted)]">Nichts gefunden.</p>
                ) : null}
              </div>
            </div>
          </details>

          {/* Stufe 4: ganze Generationen — getrennt von den Modellen. */}
          <details className={STUFE}>
            <summary className="cursor-pointer font-medium">
              Für eine ganze Generation?
              {generationIds.size > 0 ? (
                <span className="font-normal text-[var(--color-muted)]">
                  {" "}
                  — {generationen.filter((g) => generationIds.has(g.id)).map((g) => g.name).join(", ")}
                </span>
              ) : null}
            </summary>
            <div className="mt-2 space-y-2">
              <p className="text-xs text-[var(--color-muted)]">
                Ein Generation-Tipp erscheint bei ALLEN Modellen dieser
                Board-/Hardware-Generation — für plattformweite Themen wie
                Boards, Netzteile oder Batterien.
              </p>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {generationenSortiert.map((g) => (
                  <label key={g.id} className={CHECK}>
                    <input
                      type="checkbox"
                      checked={generationIds.has(g.id)}
                      onChange={() => setGenerationIds((s) => toggle(s, g.id))}
                    />
                    <span className="inline-flex items-center gap-1">
                      <Layers size={12} /> {g.name}
                      {eigeneGeneration?.id === g.id ? (
                        <span className="text-xs text-[var(--color-muted)]">
                          (Generation dieses Geräts)
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
                {generationen.length === 0 ? (
                  <p className="text-[var(--color-muted)]">Keine Generationen im Katalog.</p>
                ) : null}
              </div>
            </div>
          </details>

          <span className="text-xs text-[var(--color-muted)]">
            {anzahlZiele === 1 ? "1 Ziel ausgewählt" : `${anzahlZiele} Ziele ausgewählt`}
            {" — mindestens eines ist nötig."}
          </span>
        </div>

        <VisibilityField objekt="diesen Tipp" />

        <FormFeedback state={state} />
        <div className="flex justify-end gap-2">
          <DialogAbbrechen />
          <Button type="submit" size="sm" disabled={pending || unvollstaendig}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : null}
            {pending ? "Speichere…" : "Tipp speichern"}
          </Button>
        </div>
      </form>
    </ActionDialog>
  );
}
