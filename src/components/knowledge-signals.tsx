"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Flag, Loader2, ThumbsUp } from "lucide-react";
import { setKnowledgeSignal } from "@/db/actions/knowledge";

/*
  Community-Signal (Phase 5): einen Wissenseintrag als „hilfreich" oder „falsch"
  markieren. Genau ein Signal je Nutzer; erneutes Klicken entfernt es. Der eigene
  Eintrag zeigt nur die Zähler (man bewertet sich nicht selbst).
*/
export function KnowledgeSignals({
  knowledgeId,
  machineId,
  hilfreich,
  falsch,
  meinSignal,
  eigen,
}: {
  knowledgeId: string;
  machineId: string;
  hilfreich: number;
  falsch: number;
  meinSignal: "hilfreich" | "falsch" | null;
  eigen: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function send(wert: "hilfreich" | "falsch") {
    const fd = new FormData();
    fd.set("knowledgeId", knowledgeId);
    fd.set("machineId", machineId);
    fd.set("wert", meinSignal === wert ? "aus" : wert); // erneuter Klick = entfernen
    start(async () => {
      await setKnowledgeSignal(fd);
      router.refresh();
    });
  }

  if (eigen) {
    return (
      <div className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
        <span className="inline-flex items-center gap-1">
          <ThumbsUp size={13} /> {hilfreich}
        </span>
        <span className="inline-flex items-center gap-1">
          <Flag size={13} /> {falsch}
        </span>
      </div>
    );
  }

  const btn = (aktiv: boolean) =>
    `inline-flex items-center gap-1 rounded-[var(--radius)] border px-2 py-1 text-xs transition-colors ${
      aktiv
        ? "border-[var(--color-primary)] text-[var(--color-primary)]"
        : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
    }`;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => send("hilfreich")}
        className={btn(meinSignal === "hilfreich")}
        aria-pressed={meinSignal === "hilfreich"}
      >
        <ThumbsUp size={13} /> Hilfreich{hilfreich > 0 ? ` · ${hilfreich}` : ""}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => send("falsch")}
        className={btn(meinSignal === "falsch")}
        aria-pressed={meinSignal === "falsch"}
      >
        <Flag size={13} /> Falsch{falsch > 0 ? ` · ${falsch}` : ""}
      </button>
      {pending ? (
        <Loader2 size={13} className="animate-spin text-[var(--color-muted)]" />
      ) : null}
    </div>
  );
}
