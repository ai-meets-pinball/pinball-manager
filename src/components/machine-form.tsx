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

/* Der gewählte Gerätetyp (Katalog oder OPDB) — fürs Bestätigungs-Panel. */
type Auswahl = {
  name: string;
  baujahr: number | null;
  generationName: string | null;
  imageUrl: string | null;
  quelle: "katalog" | "opdb";
};

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

  // Diese Felder werden von der Katalog-/OPDB-Suche befüllt → kontrolliert.
  const [vals, setVals] = useState({
    hersteller: machine?.hersteller ?? "",
    modell: machine?.modell ?? "",
    baujahr: machine?.baujahr != null ? String(machine.baujahr) : "",
    opdbRef: machine?.opdbRef ?? "",
    ipdbRef: machine?.ipdbRef ?? "",
  });
  const set = (key: keyof typeof vals) => (value: string) =>
    setVals((v) => ({ ...v, [key]: value }));

  // Gewählter Gerätetyp (Panel + ggf. Bild-Übernahme, solange kein eigenes Foto).
  const [auswahl, setAuswahl] = useState<Auswahl | null>(null);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {machine ? <input type="hidden" name="id" value={machine.id} /> : null}

      {/* Primär: der EIGENE Katalog (713 Modelle, inkl. Generation + Bild).
          Die Auswahl füllt die Felder; der Gerätetyp wird serverseitig über die
          OPDB-Referenz aufgelöst (ensureMachineModel). */}
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
            imageUrl: m.imageUrl,
            quelle: "katalog",
          });
        }}
      />

      {auswahl ? (
        <div className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--color-border)] p-3">
          {/* Bild-Übernahme: Allowlist in machines.ts (img.opdb.org) — auch die
              Katalog-Bilder stammen von dort (import-images.mjs). */}
          {auswahl.imageUrl ? (
            <input type="hidden" name="opdbImageUrl" value={auswahl.imageUrl} />
          ) : null}
          {auswahl.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={auswahl.imageUrl}
              alt={auswahl.name}
              className="h-16 w-16 shrink-0 rounded-[var(--radius)] object-cover"
            />
          ) : (
            <div className="h-16 w-16 shrink-0 rounded-[var(--radius)] bg-[var(--color-inset)]" />
          )}
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{auswahl.name}</p>
            <p className="text-xs text-[var(--color-muted)]">
              {auswahl.baujahr ?? "Baujahr unbekannt"}
              {auswahl.generationName
                ? ` · ${auswahl.generationName}`
                : auswahl.quelle === "opdb"
                  ? " · Generation wird im Admin zugeordnet"
                  : ""}
            </p>
            {auswahl.imageUrl ? (
              <p className="text-xs text-[var(--color-faint)]">
                Bild wird als Foto übernommen, wenn du unten keins hochlädst.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setAuswahl(null)}
            className="ml-auto text-xs text-[var(--color-muted)] underline hover:text-[var(--color-fg)]"
          >
            Entfernen
          </button>
        </div>
      ) : null}

      {/* Fallback für Modelle, die (noch) nicht im Katalog sind — legt den
          Gerätetyp beim Speichern neu an; er erscheint dann im Admin unter
          „ohne Generation" und bekommt seine Generation dort. */}
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
                imageUrl: m.imageUrl,
                quelle: "opdb",
              });
            }}
          />
        </div>
      </details>

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

      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
