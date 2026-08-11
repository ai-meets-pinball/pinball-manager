"use client";

import { useActionState, useMemo, useState } from "react";
import { Layers, Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { FormFeedback } from "@/components/ui/form-feedback";
import { createTipp } from "@/db/actions/tipps";
import type { FormState } from "@/db/actions/clubs";

/*
  Neuen allgemeinen Tipp anlegen (typ='tipp'). Der Geltungsbereich ist n:m:
  beliebig viele Modelle und/oder Generationen aus dem Katalog, das Modell der
  aktuellen Maschine ist vorausgewählt. Die Auswahl lebt im Client-State und
  wird als hidden inputs übertragen — die Checkboxen selbst tragen bewusst
  KEINEN name: die Liste ist filterbar, und weggefilterte (unmountete)
  Checkboxen würden ihre Auswahl sonst still aus dem Submit verlieren.
*/
type Ziel = { id: string; label: string };

export function TippForm({
  machineId,
  modelle,
  generationen,
  vorauswahlModelId,
}: {
  machineId: string;
  modelle: {
    id: string;
    hersteller: string | null;
    modell: string;
    baujahr: number | null;
  }[];
  generationen: { id: string; name: string }[];
  vorauswahlModelId: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createTipp,
    {},
  );
  const [filter, setFilter] = useState("");
  const [modelIds, setModelIds] = useState<Set<string>>(
    () => new Set([vorauswahlModelId]),
  );
  const [generationIds, setGenerationIds] = useState<Set<string>>(new Set());

  const modellZiele: Ziel[] = useMemo(
    () =>
      modelle.map((m) => ({
        id: m.id,
        label: `${m.modell}${m.hersteller ? ` · ${m.hersteller}` : ""}${m.baujahr ? ` (${m.baujahr})` : ""}`,
      })),
    [modelle],
  );

  // Zwei kombinierbare Filter: Textsuche + „nur Ausgewählte" (zeigt die
  // aktuelle Auswahl gesammelt, ohne durch den ganzen Katalog zu scrollen).
  const [nurAusgewaehlte, setNurAusgewaehlte] = useState(false);
  const f = filter.trim().toLowerCase();
  const gefilterteModelle = modellZiele.filter(
    (m) =>
      (!nurAusgewaehlte || modelIds.has(m.id)) &&
      (!f || m.label.toLowerCase().includes(f)),
  );
  const gefilterteGenerationen = generationen.filter(
    (g) =>
      (!nurAusgewaehlte || generationIds.has(g.id)) &&
      (!f || g.name.toLowerCase().includes(f)),
  );

  function toggle(set: Set<string>, id: string): Set<string> {
    const neu = new Set(set);
    if (neu.has(id)) neu.delete(id);
    else neu.add(id);
    return neu;
  }

  const anzahlZiele = modelIds.size + generationIds.size;

  return (
    <details className="rounded-[var(--radius)] border border-[var(--color-border)]">
      <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]">
        <Lightbulb size={14} /> Tipp hinzufügen
      </summary>
      <form
        action={formAction}
        className="space-y-3 border-t border-[var(--color-border)] p-3"
      >
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
            placeholder="z. B. Flipperfinger-Gummis regelmäßig tauschen"
          />
        </Field>
        <Field label="Tipp">
          <Textarea
            name="text"
            required
            rows={5}
            placeholder="Was hilft, worauf achten, was vermeiden …"
          />
        </Field>

        {/* Bewusst KEIN <Field> (= <label>) um den Picker: Button und
            Checkboxen in einem Label führen zu Klick-Weiterleitungen
            (gleiches Problem wie beim Feedback-Screenshot-Dropfeld). */}
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">
            Gilt für ({anzahlZiele} ausgewählt)
          </span>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Modelle/Generationen filtern …"
                className="min-w-40 flex-1"
              />
              {/* Filter „nur Ausgewählte": Pillen-Optik wie die Unterreiter. */}
              <button
                type="button"
                onClick={() => setNurAusgewaehlte((v) => !v)}
                aria-pressed={nurAusgewaehlte}
                className={`flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-sm transition-colors ${
                  nurAusgewaehlte
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                }`}
              >
                Ausgewählte ({anzahlZiele})
              </button>
            </div>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-[var(--radius)] border border-[var(--color-border)] p-2">
              {gefilterteGenerationen.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                    Generationen
                  </p>
                  {gefilterteGenerationen.map((g) => (
                    <label
                      key={g.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={generationIds.has(g.id)}
                        onChange={() =>
                          setGenerationIds((s) => toggle(s, g.id))
                        }
                      />
                      <span className="inline-flex items-center gap-1">
                        <Layers size={12} /> {g.name}
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                  Modelle
                </p>
                {gefilterteModelle.map((m) => (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={modelIds.has(m.id)}
                      onChange={() => setModelIds((s) => toggle(s, m.id))}
                    />
                    {m.label}
                  </label>
                ))}
                {gefilterteModelle.length === 0 &&
                gefilterteGenerationen.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)]">
                    {nurAusgewaehlte && anzahlZiele === 0
                      ? "Noch nichts ausgewählt."
                      : "Nichts gefunden."}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <span className="text-xs text-[var(--color-muted)]">
            Ein oder mehrere Modelle und/oder ganze Generationen.
          </span>
        </div>

        <Field
          label="Sichtbarkeit"
          hint="Lässt sich am Eintrag jederzeit ändern."
        >
          <Select name="visibility" defaultValue="privat">
            <option value="privat">privat (nur ich)</option>
            <option value="oeffentlich">öffentlich (alle Nutzer)</option>
          </Select>
        </Field>

        <Button type="submit" disabled={pending || anzahlZiele === 0}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : null}
          {pending ? "Speichere…" : "Tipp speichern"}
        </Button>
        <FormFeedback state={state} />
      </form>
    </details>
  );
}
