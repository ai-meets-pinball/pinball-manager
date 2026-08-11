"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, ShieldAlert } from "lucide-react";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { hideKnowledge, restoreKnowledge } from "@/db/actions/knowledge";
import type { FormState } from "@/db/actions/form-state";

/*
  Kuratoren-Moderation (UI). Zwei Bausteine:

  - KnowledgeVerborgen: Banner auf einem für alle verborgenen Eintrag. Sichtbar
    ist er nur noch für den Autor (markiert, samt Begründung — kein stilles
    Zensieren), für Kuratoren und Super-Admins; Kuratoren können hier direkt
    wiederherstellen.
  - KnowledgeVerbergen: der Verbergen-Knopf für Kuratoren — klappt ein kleines
    Formular mit PFLICHT-Begründung auf (ohne Grund kein Verbergen).
*/

export function KnowledgeVerborgen({
  knowledgeId,
  machineId,
  grund,
  vonName,
  am,
  kannKuratieren,
}: {
  knowledgeId: string;
  machineId: string;
  grund: string | null;
  vonName: string | null;
  am: Date;
  kannKuratieren: boolean;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-start justify-between gap-2 rounded-[var(--radius)] border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">
      <span className="inline-flex items-start gap-2">
        <ShieldAlert size={15} className="mt-0.5 flex-none" />
        <span>
          Von Kurator {vonName ?? "unbekannt"} verborgen (
          {new Date(am).toLocaleDateString("de-DE")})
          {grund ? <>: {grund}</> : null} — für andere Nutzer nicht mehr
          sichtbar.
        </span>
      </span>
      {kannKuratieren ? (
        <form
          action={async (fd: FormData) => {
            await restoreKnowledge(fd);
            router.refresh();
          }}
        >
          <input type="hidden" name="knowledgeId" value={knowledgeId} />
          <input type="hidden" name="machineId" value={machineId} />
          <ConfirmButton
            question="Für alle wiederherstellen?"
            confirmLabel="Ja, wiederherstellen"
          >
            Wiederherstellen
          </ConfirmButton>
        </form>
      ) : null}
    </div>
  );
}

export function KnowledgeVerbergen({
  knowledgeId,
  machineId,
}: {
  knowledgeId: string;
  machineId: string;
}) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const res = await hideKnowledge(prev, fd);
      if (res.message) {
        setOffen(false);
        router.refresh();
      }
      return res;
    },
    {},
  );

  if (!offen) {
    return (
      <button
        type="button"
        onClick={() => setOffen(true)}
        title="Als Kurator für alle verbergen"
        className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
      >
        <EyeOff size={13} /> Verbergen
      </button>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-2 text-xs">
      <input type="hidden" name="knowledgeId" value={knowledgeId} />
      <input type="hidden" name="machineId" value={machineId} />
      <textarea
        name="grund"
        rows={2}
        autoFocus
        placeholder="Begründung (Pflicht) — für alle sichtbar verbergen"
        className="w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="text-[var(--color-danger)] hover:underline disabled:opacity-50"
        >
          {pending ? "…" : "Für alle verbergen"}
        </button>
        <button
          type="button"
          onClick={() => setOffen(false)}
          className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          Abbrechen
        </button>
      </div>
      <FormFeedback state={state} />
    </form>
  );
}
