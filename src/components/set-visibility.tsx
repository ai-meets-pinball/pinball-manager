"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setKnowledgeVisibility } from "@/db/actions/knowledge";
import type { FormState } from "@/db/actions/form-state";

type Sicht = "privat" | "club" | "oeffentlich";

/*
  Sichtbarkeit eines eigenen Wissenseintrags ändern (privat ⇄ öffentlich; ein
  bestehender Club-Wert bleibt wählbar). Ersetzt das frühere „Fakten teilen".
  Kleine, reversible Wahl → das Auswahlfeld speichert beim Ändern (P2), ohne
  eigenen Knopf; es ist die EINE Stelle im Kopf, die die Sichtbarkeit zeigt.
*/
export function SetVisibility({
  knowledgeId,
  machineId,
  current,
}: {
  knowledgeId: string;
  machineId: string;
  current: Sicht;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const res = await setKnowledgeVisibility(prev, fd);
      if (res.message) router.refresh();
      return res;
    },
    {},
  );

  return (
    <form action={formAction} className="flex items-center gap-1.5 text-xs">
      <input type="hidden" name="id" value={knowledgeId} />
      <input type="hidden" name="machineId" value={machineId} />
      <label className="flex items-center gap-1.5">
        <span className="text-[var(--color-muted)]">Sichtbar:</span>
        <select
          name="visibility"
          defaultValue={current}
          disabled={pending}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 disabled:opacity-50"
        >
          <option value="privat">privat</option>
          <option value="oeffentlich">öffentlich</option>
          {current === "club" ? <option value="club">Club</option> : null}
        </select>
      </label>
      {pending ? (
        <Loader2 size={13} className="animate-spin text-[var(--color-muted)]" />
      ) : null}
      {state.error ? (
        <span className="text-[var(--color-danger)]">{state.error}</span>
      ) : null}
    </form>
  );
}
