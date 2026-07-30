"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { setKnowledgeOverride } from "@/db/actions/knowledge";

/*
  Persönliches Ausblenden (Phase 5): einen fremden Wissenseintrag für sich
  ausblenden. Ausgeblendet wird der Eintrag zu einem einzeiligen Stub mit
  „Einblenden" — so bleibt das Rückgängigmachen trivial (die volle Anzeige
  entfällt, nur der Wiederherstellen-Griff bleibt).
*/
export function KnowledgeHide({
  knowledgeId,
  machineId,
  ausgeblendet,
  titel,
}: {
  knowledgeId: string;
  machineId: string;
  ausgeblendet: boolean;
  titel: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle(hide: boolean) {
    const fd = new FormData();
    fd.set("knowledgeId", knowledgeId);
    fd.set("machineId", machineId);
    fd.set("hide", String(hide));
    start(async () => {
      await setKnowledgeOverride(fd);
      router.refresh();
    });
  }

  if (ausgeblendet) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-dashed border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <EyeOff size={14} /> Ausgeblendet: {titel}
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() => toggle(false)}
          className="inline-flex items-center gap-1 hover:text-[var(--color-fg)]"
        >
          {pending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Eye size={13} />
          )}{" "}
          Einblenden
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => toggle(true)}
      title="Für dich ausblenden"
      className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
    >
      {pending ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <EyeOff size={13} />
      )}{" "}
      Ausblenden
    </button>
  );
}
