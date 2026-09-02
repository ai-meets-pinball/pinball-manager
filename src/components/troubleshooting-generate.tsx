"use client";

import { useActionState } from "react";
import { LifeBuoy, Loader2, RefreshCw } from "lucide-react";
import { DialogAbbrechen } from "@/components/ui/action-dialog";
import { AiProviderField } from "@/components/ui/ai-provider-field";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { VisibilityField } from "@/components/ui/visibility-field";
import type { AiProvider } from "@/lib/ai/provider";
import {
  generateTroubleshootingGuide,
  type GuideState,
} from "@/lib/troubleshooting";

/*
  Gültigkeit eines Guides: nur dieses Modell oder die ganze Generation (alle
  Modelle derselben Board-/Hardware-Generation). EIN Feld für KI-Erzeugung und
  JSON-Import (Feldname `ebene`, Default modell); ohne bekannte Generation gibt
  es nichts zu wählen.
*/
export function GueltigkeitFeld({
  generation,
}: {
  generation?: { name: string } | null;
}) {
  if (!generation) return null;
  return (
    <Field label="Gültigkeit">
      <Select name="ebene" defaultValue="modell">
        <option value="modell">Nur dieses Modell</option>
        <option value="generation">
          Ganze Generation „{generation.name}“ (alle Modelle)
        </option>
      </Select>
    </Field>
  );
}

/*
  Formular für die KI-Erstellung des Guides — lebt im „Guide erstellen"-Dialog
  (guide-erstellen.tsx). Die echte Arbeit passiert serverseitig
  (lib/troubleshooting.ts); hier nur Felder + Zustand. Nach Erfolg meldet
  `onErfolg` dem Dialog das Schließen; die Seite rendert den gespeicherten
  Guide (revalidatePath in der Action).
*/
export function TroubleshootingGenerate({
  machineId,
  vorhanden,
  providers,
  centralKey,
  generation,
  onErfolg,
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
  /** Wird nach erfolgreicher Erstellung gerufen (schließt den Dialog). */
  onErfolg?: () => void;
}) {
  const [state, formAction, pending] = useActionState<GuideState, FormData>(
    async (prev, fd) => {
      const res = await generateTroubleshootingGuide(prev, fd);
      if (res.ok) onErfolg?.();
      return res;
    },
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="machineId" value={machineId} />

      <AiProviderField providers={providers} centralKey={centralKey} />
      <GueltigkeitFeld generation={generation} />
      <VisibilityField objekt="diesen Guide" />

      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <DialogAbbrechen />
        <Button type="submit" size="sm" disabled={pending}>
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
      </div>
    </form>
  );
}
