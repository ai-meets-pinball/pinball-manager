"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil } from "lucide-react";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Select } from "@/components/ui/input";
import { assignModelGeneration } from "@/db/actions/generations";
import type { FormState } from "@/db/actions/clubs";

/*
  Generation eines Modells: ANZEIGEN zuerst (der Name als Text), Ändern auf
  Verlangen (Stift → Select). Das Select submittet direkt bei Änderung und
  schließt bei Erfolg; Fehler werden angezeigt (FormFeedback), nicht verschluckt.
  „— keine —" ist eine bewusste Zuordnung ohne Generation.
*/
export function ModelGenerationSelect({
  modelId,
  generationen,
  aktuell,
  aktuellName,
}: {
  modelId: string;
  generationen: { id: string; name: string }[];
  aktuell: string | null;
  /** Name der aktuellen Generation (oder null) — für die Anzeige. */
  aktuellName: string | null;
}) {
  const router = useRouter();
  const [bearbeiten, setBearbeiten] = useState(false);
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>({});

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const generationId = e.target.value;
    const fd = new FormData();
    fd.set("modelId", modelId);
    fd.set("generationId", generationId);
    setState({});
    start(async () => {
      try {
        const res = await assignModelGeneration(fd);
        setState(res);
        if (!res.error) setBearbeiten(false);
      } catch {
        setState({ error: "Speichern fehlgeschlagen. Bitte erneut versuchen." });
      }
      router.refresh();
    });
  }

  if (!bearbeiten) {
    return (
      <span className="inline-flex items-center gap-2">
        <span
          className={
            aktuellName
              ? "text-sm"
              : "text-sm text-[var(--color-faint)]"
          }
        >
          {aktuellName ?? "keine Generation"}
        </span>
        <button
          type="button"
          onClick={() => setBearbeiten(true)}
          aria-label="Generation ändern"
          title="Generation ändern"
          className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          <Pencil size={14} />
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {pending ? (
        <Loader2 size={14} className="animate-spin text-[var(--color-muted)]" />
      ) : null}
      <Select
        defaultValue={aktuell ?? ""}
        onChange={onChange}
        disabled={pending}
        autoFocus
        aria-label="Generation zuordnen"
        className="max-w-64"
      >
        <option value="">— keine —</option>
        {generationen.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </Select>
      <button
        type="button"
        onClick={() => setBearbeiten(false)}
        className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      >
        Abbrechen
      </button>
      <FormFeedback state={state} />
    </span>
  );
}
