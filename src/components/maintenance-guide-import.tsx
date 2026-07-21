"use client";

import { useActionState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import {
  importMaintenanceFromGuide,
  type FormState,
} from "@/db/actions/maintenance";

/*
  „Aus Guide übernehmen": lässt Claude den Wartungsplan-Abschnitt des
  Troubleshooting-Guides in strukturierte Wartungspunkte umwandeln. Nur der
  Auslöser + Zustand hier; die Arbeit passiert serverseitig (actions/maintenance).
*/
export function MaintenanceGuideImport({ machineId }: { machineId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    importMaintenanceFromGuide,
    {},
  );

  return (
    <form action={formAction} className="inline-flex flex-col gap-1">
      <input type="hidden" name="machineId" value={machineId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]/40 disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 size={15} className="animate-spin" /> Extrahiere…
          </>
        ) : (
          <>
            <Sparkles size={15} /> Aus Guide übernehmen
          </>
        )}
      </button>
      {state.error ? (
        <span className="text-sm text-[var(--color-danger)]">{state.error}</span>
      ) : null}
      {state.ok ? (
        <span className="text-sm text-[var(--color-success)]">
          Wartungspunkte aus dem Guide übernommen.
        </span>
      ) : null}
    </form>
  );
}
