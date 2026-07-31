"use client";

import { useActionState, useState } from "react";
import { ModelSearch } from "@/components/model-search";
import { OpdbSearch } from "@/components/opdb-search";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { modellName } from "@/lib/format";
import type { FormState } from "@/db/actions/machines";

type Club = { id: string; name: string };

type MachineValues = {
  id: string;
  hersteller: string;
  modell: string;
  baujahr: number | null;
  opdbRef: string | null;
  ipdbRef: string | null;
  clubId: string | null;
};

/* Der gewählte Gerätetyp (Katalog oder OPDB) — fürs Anzeige-Panel. */
type Auswahl = {
  name: string;
  baujahr: number | null;
  generationName: string | null;
  opdbRef: string;
  ipdbRef: string | null;
  imageUrl: string | null;
  quelle: "katalog" | "opdb";
};

/*
  Anlegen ist AUSWÄHLEN, nicht Eintippen: der Standardweg ist die Katalog-Suche;
  die gewählten Daten (inkl. Generation) werden als Panel ANGEZEIGT und per
  Hidden-Inputs submittet — kein Eingabeformular. Die editierbaren Felder
  erscheinen nur im manuellen Modus (Handeintrag ohne Katalog/OPDB oder
  „Manuell anpassen") und beim Bearbeiten einer bestehenden Maschine.
*/
export function MachineForm({
  action,
  clubs,
  machine,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  clubs: Club[];
  machine?: MachineValues;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );

  const [vals, setVals] = useState({
    hersteller: machine?.hersteller ?? "",
    modell: machine?.modell ?? "",
    baujahr: machine?.baujahr != null ? String(machine.baujahr) : "",
    opdbRef: machine?.opdbRef ?? "",
    ipdbRef: machine?.ipdbRef ?? "",
  });
  const set = (key: keyof typeof vals) => (value: string) =>
    setVals((v) => ({ ...v, [key]: value }));

  // Gewählter Gerätetyp (Anzeige-Panel + Hidden-Inputs).
  const [auswahl, setAuswahl] = useState<Auswahl | null>(null);
  // Manueller Modus: editierbare Felder. Beim Bearbeiten von Anfang an an.
  const [manuell, setManuell] = useState(Boolean(machine));
  // Ohne Auswahl und ohne manuellen Modus gibt es nichts zu speichern.
  const bereit = Boolean(auswahl) || manuell;

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {machine ? <input type="hidden" name="id" value={machine.id} /> : null}

      {/* Primär: der EIGENE Katalog (inkl. Generation + Bild). Der Gerätetyp
          wird serverseitig über die OPDB-Referenz aufgelöst (ensureMachineModel). */}
      <ModelSearch
        onSelect={(m) => {
          setVals({
            hersteller: m.hersteller,
            modell: m.modell,
            baujahr: m.baujahr != null ? String(m.baujahr) : "",
            opdbRef: m.opdbRef,
            ipdbRef: m.ipdbRef ?? "",
          });
          setAuswahl({
            name: modellName(m),
            baujahr: m.baujahr,
            generationName: m.generationName,
            opdbRef: m.opdbRef,
            ipdbRef: m.ipdbRef,
            imageUrl: m.imageUrl,
            quelle: "katalog",
          });
          setManuell(false);
        }}
      />

      {/* Fallback für Modelle, die (noch) nicht im Katalog sind — legt den
          Gerätetyp beim Speichern neu an; Generation folgt im Admin. */}
      <details className="text-sm">
        <summary className="cursor-pointer text-[var(--color-muted)] hover:text-[var(--color-fg)]">
          Nicht im Katalog? Aus OPDB übernehmen …
        </summary>
        <div className="pt-2">
          <OpdbSearch
            onSelect={(m) => {
              setVals({
                hersteller: m.hersteller,
                modell: m.modell,
                baujahr: m.baujahr != null ? String(m.baujahr) : "",
                opdbRef: m.opdbRef,
                ipdbRef: m.ipdbRef ?? "",
              });
              setAuswahl({
                name: modellName(m),
                baujahr: m.baujahr,
                generationName: null,
                opdbRef: m.opdbRef,
                ipdbRef: m.ipdbRef,
                imageUrl: m.imageUrl,
                quelle: "opdb",
              });
              setManuell(false);
            }}
          />
        </div>
      </details>

      {auswahl && !manuell ? (
        /* ── Anzeige-Panel: der gewählte Gerätetyp (KEIN Eingabeformular). ── */
        <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--color-border)] p-3">
          {/* Die Daten des Typs gehen als Hidden-Inputs mit; die Allowlist für
              das Bild sitzt in machines.ts (img.opdb.org — auch Katalog-Bilder). */}
          <input type="hidden" name="hersteller" value={vals.hersteller} />
          <input type="hidden" name="modell" value={vals.modell} />
          <input type="hidden" name="baujahr" value={vals.baujahr} />
          <input type="hidden" name="opdbRef" value={vals.opdbRef} />
          <input type="hidden" name="ipdbRef" value={vals.ipdbRef} />
          {auswahl.imageUrl ? (
            <input type="hidden" name="opdbImageUrl" value={auswahl.imageUrl} />
          ) : null}

          {auswahl.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={auswahl.imageUrl}
              alt={auswahl.name}
              className="h-20 w-20 shrink-0 rounded-[var(--radius)] object-cover"
            />
          ) : (
            <div className="h-20 w-20 shrink-0 rounded-[var(--radius)] bg-[var(--color-inset)]" />
          )}
          <div className="min-w-0 flex-1 space-y-0.5 text-sm">
            <p className="truncate font-medium">{auswahl.name}</p>
            <p className="text-[var(--color-muted)]">
              {auswahl.baujahr ?? "Baujahr unbekannt"}
            </p>
            <p className="text-[var(--color-muted)]">
              {auswahl.generationName
                ? `Generation: ${auswahl.generationName}`
                : "Generation wird im Admin zugeordnet"}
            </p>
            <p className="font-mono text-xs text-[var(--color-faint)]">
              {auswahl.opdbRef}
              {auswahl.ipdbRef ? ` · IPDB ${auswahl.ipdbRef}` : ""}
            </p>
            {auswahl.imageUrl ? (
              <p className="pt-1 text-xs text-[var(--color-faint)]">
                Bild wird als Foto übernommen, wenn du unten keins hochlädst.
              </p>
            ) : null}
          </div>
          <div className="ml-auto flex shrink-0 flex-col items-end gap-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setAuswahl(null);
              }}
              className="text-[var(--color-muted)] underline hover:text-[var(--color-fg)]"
            >
              Entfernen
            </button>
            <button
              type="button"
              onClick={() => setManuell(true)}
              className="text-[var(--color-muted)] underline hover:text-[var(--color-fg)]"
            >
              Manuell anpassen
            </button>
          </div>
        </div>
      ) : manuell ? (
        /* ── Manueller Modus: editierbare Felder (Handeintrag / Anpassen). ── */
        <>
          <Field label="Hersteller">
            <Input
              name="hersteller"
              required
              value={vals.hersteller}
              onChange={(e) => set("hersteller")(e.target.value)}
            />
          </Field>
          <Field label="Modell">
            <Input
              name="modell"
              required
              value={vals.modell}
              onChange={(e) => set("modell")(e.target.value)}
            />
          </Field>
          <Field label="Baujahr">
            <Input
              name="baujahr"
              type="number"
              value={vals.baujahr}
              onChange={(e) => set("baujahr")(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="OPDB-Referenz">
              <Input
                name="opdbRef"
                value={vals.opdbRef}
                onChange={(e) => set("opdbRef")(e.target.value)}
              />
            </Field>
            <Field label="IPDB-Referenz">
              <Input
                name="ipdbRef"
                value={vals.ipdbRef}
                onChange={(e) => set("ipdbRef")(e.target.value)}
              />
            </Field>
          </div>
          {auswahl?.imageUrl ? (
            <input type="hidden" name="opdbImageUrl" value={auswahl.imageUrl} />
          ) : null}
        </>
      ) : (
        /* ── Noch nichts gewählt: Hinweis + Weg in den manuellen Modus. ── */
        <p className="text-sm text-[var(--color-muted)]">
          Wähle oben einen Gerätetyp aus dem Katalog —{" "}
          <button
            type="button"
            onClick={() => setManuell(true)}
            className="underline hover:text-[var(--color-fg)]"
          >
            oder manuell eingeben
          </button>
          .
        </p>
      )}

      <Field label="Club (optional)" hint="Geteilt mit den Mitgliedern des Clubs.">
        <Select name="clubId" defaultValue={machine?.clubId ?? ""}>
          <option value="">— Nur für mich —</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Foto"
        hint={
          machine?.id
            ? "Leer lassen, um das aktuelle Foto zu behalten."
            : "Optional — überschreibt das Katalog-/OPDB-Bild."
        }
      >
        <Input name="foto" type="file" accept="image/*" />
      </Field>

      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending || !bereit}>
        {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
