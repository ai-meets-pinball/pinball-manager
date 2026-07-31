"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Select } from "@/components/ui/input";
import { assignModelGeneration } from "@/db/actions/generations";
import type { FormState } from "@/db/actions/clubs";

/*
  Generation eines Modells setzen (Super-Admin, Gerätetypen-Liste). Das Select
  submittet direkt bei Änderung. „Auto (Import)" gibt das Modell an den Katalog-
  Import zurück; „— keine —" ist eine bewusste Hand-Zuordnung ohne Generation.
  Fehler der Action werden angezeigt (FormFeedback), nicht verschluckt.
*/
export function ModelGenerationSelect({
  modelId,
  generationen,
  aktuell,
  manuell,
}: {
  modelId: string;
  generationen: { id: string; name: string }[];
  aktuell: string | null;
  manuell: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>({});

  // Bei Import-Zuordnung ist der Wert „auto"; bei Hand-Zuordnung die Generation.
  const value = manuell ? (aktuell ?? "") : "auto";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const generationId = e.target.value;
    const fd = new FormData();
    fd.set("modelId", modelId);
    fd.set("generationId", generationId);
    setState({});
    start(async () => {
      try {
        setState(await assignModelGeneration(fd));
      } catch {
        setState({ error: "Speichern fehlgeschlagen. Bitte erneut versuchen." });
      }
      router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {pending ? (
        <Loader2 size={14} className="animate-spin text-[var(--color-muted)]" />
      ) : null}
      <Select
        value={value}
        onChange={onChange}
        disabled={pending}
        aria-label="Generation zuordnen"
        className="max-w-64"
      >
        <option value="auto">Auto (Import)</option>
        <option value="">— keine —</option>
        {generationen.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </Select>
      <FormFeedback state={state} />
    </span>
  );
}
