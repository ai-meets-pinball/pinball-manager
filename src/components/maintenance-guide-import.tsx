"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiProviderField } from "@/components/ui/ai-provider-field";
import type { AiProvider } from "@/lib/ai/provider";
import {
  importMaintenanceFromGuide,
} from "@/db/actions/maintenance";
import type { FormState } from "@/db/actions/form-state";

/*
  „Aus Guide übernehmen": lässt Claude den Wartungsplan-Abschnitt des
  Troubleshooting-Guides in strukturierte Wartungspunkte umwandeln. Nur der
  Auslöser + Zustand hier; die Arbeit passiert serverseitig (actions/maintenance).
*/
export function MaintenanceGuideImport({
  machineId,
  providers,
  centralKey,
  byoErlaubt,
  erlaubt,
  grund,
}: {
  machineId: string;
  /** Verfügbare KI-Anbieter (Auswahl, wenn mehrere). */
  providers: AiProvider[];
  /** Zentraler Anthropic-Key vorhanden? Sonst BYO-Feld beim Claude-Weg. */
  centralKey: boolean;
  byoErlaubt: boolean;
  /** Darf dieser Nutzer das (lib/ki-zugang)? Sonst Knopf gesperrt mit Grund. */
  erlaubt: boolean;
  grund?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
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

      {erlaubt ? (
        <AiProviderField providers={providers} centralKey={centralKey} byoErlaubt={byoErlaubt} />
      ) : null}

      <Button
        type="submit"
        variant="secondary"
        size="sm"
        disabled={!erlaubt}
        title={!erlaubt ? grund : undefined}
        className="self-start"
      >
        <Sparkles size={15} /> Aus Guide übernehmen
      </Button>
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
