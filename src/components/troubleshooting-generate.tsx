"use client";

import { useActionState } from "react";
import { LifeBuoy, Loader2, RefreshCw } from "lucide-react";
import { AiProviderField } from "@/components/ui/ai-provider-field";
import { Button } from "@/components/ui/button";
import { VisibilityField } from "@/components/ui/visibility-field";
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
  generation,
}: {
  machineId: string;
  vorhanden: boolean;
  /** Verfügbare KI-Anbieter (Auswahl, wenn mehrere). */
  providers: AiProvider[];
  /** Zentraler Anthropic-Key vorhanden? Sonst BYO-Feld beim Claude-Weg. */
  centralKey: boolean;
  /** Generation des Modells (falls bekannt) — erlaubt einen Guide, der für
      ALLE Modelle dieser Board-/Hardware-Generation gilt. */
  generation?: { name: string } | null;
}) {
  const [state, formAction, pending] = useActionState<GuideState, FormData>(
    generateTroubleshootingGuide,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="machineId" value={machineId} />

      <AiProviderField providers={providers} centralKey={centralKey} />

      {generation ? (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Gültigkeit</span>
          <select
            name="ebene"
            defaultValue="modell"
            className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]"
          >
            <option value="modell">Nur dieses Modell</option>
            <option value="generation">
              Ganze Generation „{generation.name}“ (alle Modelle)
            </option>
          </select>
        </label>
      ) : null}

      <VisibilityField />

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
