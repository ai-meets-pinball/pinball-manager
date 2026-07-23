"use client";

import { useActionState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { AiProviderField } from "@/components/ui/ai-provider-field";
import type { AiProvider } from "@/lib/ai/provider";
import {
  importMaintenanceFromGuide,
  type FormState,
} from "@/db/actions/maintenance";

/*
  „Aus Guide übernehmen": lässt Claude den Wartungsplan-Abschnitt des
  Troubleshooting-Guides in strukturierte Wartungspunkte umwandeln. Nur der
  Auslöser + Zustand hier; die Arbeit passiert serverseitig (actions/maintenance).
*/
export function MaintenanceGuideImport({
  machineId,
  providers,
  centralKey,
}: {
  machineId: string;
  /** Verfügbare KI-Anbieter (Auswahl, wenn mehrere). */
  providers: AiProvider[];
  /** Zentraler Anthropic-Key vorhanden? Sonst BYO-Feld beim Claude-Weg. */
  centralKey: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    importMaintenanceFromGuide,
    {},
  );

  // Nur ein Anbieter ohne Key-Feld → kompakter Inline-Button; sonst (Auswahl
  // oder BYO-Feld) ein Block.
  const einzeln = providers.length === 1 ? providers[0] : null;
  const brauchtKey = (einzeln === "anthropic" || einzeln === "auto") && !centralKey;
  const kompakt = einzeln !== null && !brauchtKey;

  return (
    <form
      action={formAction}
      className={kompakt ? "inline-flex flex-col gap-1" : "flex w-full max-w-md flex-col gap-2"}
    >
      <input type="hidden" name="machineId" value={machineId} />

      <AiProviderField providers={providers} centralKey={centralKey} />

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 self-start rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]/40 disabled:opacity-50"
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
