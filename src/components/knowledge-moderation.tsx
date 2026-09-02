"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, ShieldAlert } from "lucide-react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Field, Textarea } from "@/components/ui/input";
import { hideKnowledge, restoreKnowledge } from "@/db/actions/knowledge";
import type { FormState } from "@/db/actions/form-state";

/*
  Kuratoren-Moderation (UI). Zwei Bausteine:

  - KnowledgeVerborgen: Banner auf einem für alle verborgenen Eintrag. Sichtbar
    ist er nur noch für den Autor (markiert, samt Begründung — kein stilles
    Zensieren), für Kuratoren und Super-Admins; Kuratoren können hier direkt
    wiederherstellen.
  - KnowledgeVerbergen: der Verbergen-Knopf für Kuratoren — öffnet einen
    Dialog mit PFLICHT-Begründung (ohne Grund bleibt „Für alle verbergen"
    deaktiviert; die Action prüft dasselbe).
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
  // revalidatePath erreicht die Modell-Seite nicht (machineId leer) → refresh.
  const [restoreState, restoreAction] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const res = await restoreKnowledge(prev, fd);
      if (res.ok) router.refresh();
      return res;
    },
    {},
  );

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
        <form action={restoreAction}>
          <input type="hidden" name="knowledgeId" value={knowledgeId} />
          <input type="hidden" name="machineId" value={machineId} />
          <ConfirmButton
            question="Für alle wiederherstellen?"
            confirmLabel="Ja, wiederherstellen"
          >
            Wiederherstellen
          </ConfirmButton>
          <FormFeedback state={restoreState} />
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
  const [offen, setOffen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        title="Als Kurator für alle verbergen"
        className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
      >
        <EyeOff size={13} /> Verbergen
      </button>
      {offen ? (
        <VerbergenDialog
          knowledgeId={knowledgeId}
          machineId={machineId}
          onClose={() => setOffen(false)}
        />
      ) : null}
    </>
  );
}

/* Nur gemountet, solange offen — frische Begründung bei jeder Öffnung. */
function VerbergenDialog({
  knowledgeId,
  machineId,
  onClose,
}: {
  knowledgeId: string;
  machineId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [grund, setGrund] = useState("");
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const res = await hideKnowledge(prev, fd);
      if (res.message) router.refresh();
      return res;
    },
    {},
  );

  return (
    <ActionDialog onClose={onClose} ok={Boolean(state.message)}>
      <form action={formAction} className="space-y-4 p-5">
        <h3 className="text-base font-semibold">Für alle verbergen</h3>
        <p className="text-sm text-[var(--color-muted)]">
          Der Eintrag bleibt für den Autor, Kuratoren und Super-Admins sichtbar
          — samt deiner Begründung. Wiederherstellen ist jederzeit möglich.
        </p>
        <input type="hidden" name="knowledgeId" value={knowledgeId} />
        <input type="hidden" name="machineId" value={machineId} />
        <Field label="Begründung (Pflicht)">
          <Textarea
            name="grund"
            rows={3}
            autoFocus
            value={grund}
            onChange={(e) => setGrund(e.target.value)}
            placeholder="Warum soll dieser Eintrag für alle verborgen werden?"
          />
        </Field>
        <FormFeedback state={state} />
        <div className="flex justify-end gap-2">
          <DialogAbbrechen />
          <Button
            type="submit"
            variant="danger"
            size="sm"
            disabled={pending || !grund.trim()}
          >
            {pending ? "…" : "Für alle verbergen"}
          </Button>
        </div>
      </form>
    </ActionDialog>
  );
}
