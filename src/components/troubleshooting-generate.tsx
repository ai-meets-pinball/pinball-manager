"use client";

import { useActionState } from "react";
import { LifeBuoy, Loader2, RefreshCw } from "lucide-react";
import { AiProviderField } from "@/components/ui/ai-provider-field";
import { Button } from "@/components/ui/button";
import type { AiProvider } from "@/lib/ai/provider";
import {
  generateTroubleshootingGuide,
  type GuideState,
} from "@/lib/troubleshooting";

/*
  Auslöser für die Guide-Erstellung. Wie beim Handbuch-Upload passiert die echte
  Arbeit serverseitig (lib/troubleshooting.ts); hier nur Button + Zustand. Nach
  Erfolg rendert die Seite den gespeicherten Guide (revalidatePath in der Action).
*/
export function TroubleshootingGenerate({
  machineId,
  vorhanden,
  providers,
  centralKey,
}: {
  machineId: string;
  vorhanden: boolean;
  /** Verfügbare KI-Anbieter (Auswahl, wenn mehrere). */
  providers: AiProvider[];
  /** Zentraler Anthropic-Key vorhanden? Sonst BYO-Feld beim Claude-Weg. */
  centralKey: boolean;
}) {
  const [state, formAction, pending] = useActionState<GuideState, FormData>(
    generateTroubleshootingGuide,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="machineId" value={machineId} />

      <AiProviderField providers={providers} centralKey={centralKey} />

      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}

      <Button
        type="submit"
        variant={vorhanden ? "secondary" : "primary"}
        disabled={pending}
        className="self-start"
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Erstelle Guide… (kann
            1–2 Minuten dauern)
          </>
        ) : vorhanden ? (
          <>
            <RefreshCw size={16} /> Guide neu erstellen
          </>
        ) : (
          <>
            <LifeBuoy size={16} /> Troubleshooting-Guide erstellen
          </>
        )}
      </Button>
    </form>
  );
}
