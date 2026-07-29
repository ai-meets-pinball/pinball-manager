"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { assignModelGeneration } from "@/db/actions/generations";

/*
  Generation eines Modells setzen (Super-Admin, Flippermasterliste). Das Select
  submittet direkt bei Änderung. „Auto (Import)" gibt das Modell an den Katalog-
  Import zurück; „— keine —" ist eine bewusste Hand-Zuordnung ohne Generation.
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

  // Bei Import-Zuordnung ist der Wert die aktuelle Generation, bei manuellem
  // Modus ebenfalls — die Unterscheidung „auto" wählt man aktiv.
  const value = manuell ? (aktuell ?? "") : "auto";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const generationId = e.target.value;
    const fd = new FormData();
    fd.set("modelId", modelId);
    fd.set("generationId", generationId);
    start(async () => {
      await assignModelGeneration(fd);
      router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      {pending ? (
        <Loader2 size={14} className="animate-spin text-[var(--color-muted)]" />
      ) : null}
      <select
        value={value}
        onChange={onChange}
        disabled={pending}
        className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]"
      >
        <option value="auto">Auto (Import)</option>
        <option value="">— keine —</option>
        {generationen.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </span>
  );
}
