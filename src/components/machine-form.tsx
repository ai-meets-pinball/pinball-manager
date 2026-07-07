"use client";

import { useActionState, useState } from "react";
import { OpdbSearch } from "@/components/opdb-search";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
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

  // Diese Felder werden von der OPDB-Suche befüllt → kontrollierte Eingaben.
  const [vals, setVals] = useState({
    hersteller: machine?.hersteller ?? "",
    modell: machine?.modell ?? "",
    baujahr: machine?.baujahr != null ? String(machine.baujahr) : "",
    opdbRef: machine?.opdbRef ?? "",
    ipdbRef: machine?.ipdbRef ?? "",
  });
  const set = (key: keyof typeof vals) => (value: string) =>
    setVals((v) => ({ ...v, [key]: value }));

  // Bild-URL aus OPDB (falls ein Treffer eins hat). Wird als Foto übernommen,
  // solange der Nutzer kein eigenes Foto hochlädt.
  const [opdbImage, setOpdbImage] = useState<string | null>(null);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {machine ? <input type="hidden" name="id" value={machine.id} /> : null}

      <OpdbSearch
        onSelect={(m) => {
          setVals({
            hersteller: m.hersteller,
            modell: m.modell,
            baujahr: m.baujahr != null ? String(m.baujahr) : "",
            opdbRef: m.opdbRef,
            ipdbRef: m.ipdbRef ?? "",
          });
          setOpdbImage(m.imageUrl);
        }}
      />

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

      {opdbImage ? (
        <div className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--color-border)] p-3">
          <input type="hidden" name="opdbImageUrl" value={opdbImage} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={opdbImage}
            alt="OPDB-Bild"
            className="h-16 w-16 shrink-0 rounded-[var(--radius)] object-cover"
          />
          <div className="min-w-0 text-sm">
            <p className="font-medium">Bild aus OPDB</p>
            <p className="text-xs text-[var(--color-muted)]">
              Wird als Foto übernommen, wenn du unten keins hochlädst.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpdbImage(null)}
            className="ml-auto text-xs text-[var(--color-muted)] underline hover:text-[var(--color-fg)]"
          >
            Entfernen
          </button>
        </div>
      ) : null}

      <Field
        label="Foto"
        hint={
          machine?.id
            ? "Leer lassen, um das aktuelle Foto zu behalten."
            : "Optional — überschreibt ein OPDB-Bild."
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
