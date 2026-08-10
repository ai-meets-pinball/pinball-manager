"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { setKnowledgeVisibility } from "@/db/actions/knowledge";
import type { FormState } from "@/db/actions/form-state";

type Sicht = "privat" | "club" | "oeffentlich";

/*
  Sichtbarkeit eines eigenen Wissenseintrags ändern (privat ⇄ öffentlich; ein
  bestehender Club-Wert bleibt wählbar). Ersetzt das frühere „Fakten teilen".
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
      <span className="text-[var(--color-muted)]">Sichtbar:</span>
      <select
        name="visibility"
        defaultValue={current}
        disabled={pending}
        className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
      >
        <option value="privat">privat</option>
        <option value="oeffentlich">öffentlich</option>
        {current === "club" ? <option value="club">Club</option> : null}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="text-[var(--color-primary)] hover:underline disabled:opacity-50"
      >
        {pending ? "…" : "ändern"}
      </button>
      {state.error ? (
        <span className="text-[var(--color-danger)]">{state.error}</span>
      ) : null}
    </form>
  );
}
