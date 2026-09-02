"use client";

import { useState } from "react";
import { FileJson, LifeBuoy, RefreshCw, Sparkles } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { TroubleshootingGenerate } from "@/components/troubleshooting-generate";
import { TroubleshootingJsonImport } from "@/components/troubleshooting-json-import";
import type { AiProvider } from "@/lib/ai/provider";

/*
  EIN Knopf „Guide erstellen" (bzw. „Guide ersetzen", wenn ein eigener Guide
  existiert) für den Guide-Reiter — statt zweier dauerhaft offener Formulare
  unter dem Guide. Der Dialog trägt einen Modus-Schalter: „Per KI erzeugen"
  (TroubleshootingGenerate) oder „JSON importieren" (TroubleshootingJsonImport,
  ohne KI-Verarbeitung in der App). Beide Wege füllen denselben Wissenseintrag;
  ihr Erfolg schließt den Dialog, die Seite zeigt den neuen Guide.
*/
const MODI = [
  { key: "ki" as const, label: "Per KI erzeugen", icon: Sparkles },
  { key: "json" as const, label: "JSON importieren", icon: FileJson },
];

type Props = {
  machineId: string;
  /** Eigener Guide existiert bereits → Knopf und Titel sagen „ersetzen". */
  vorhanden: boolean;
  providers: AiProvider[];
  centralKey: boolean;
  generation?: { name: string } | null;
  /** Kopierbarer Import-Prompt (serverseitig aufgelöst). */
  prompt: string;
};

export function GuideErstellen(props: Props) {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOffen(true)}
      >
        {props.vorhanden ? (
          <>
            <RefreshCw size={14} /> Guide ersetzen
          </>
        ) : (
          <>
            <LifeBuoy size={14} /> Guide erstellen
          </>
        )}
      </Button>
      {offen ? <GuideDialog {...props} onClose={() => setOffen(false)} /> : null}
    </>
  );
}

/* Nur gemountet, solange offen — der Modus startet bei jeder Öffnung bei „KI". */
function GuideDialog({
  machineId,
  vorhanden,
  providers,
  centralKey,
  generation,
  prompt,
  onClose,
}: Props & { onClose: () => void }) {
  const [modus, setModus] = useState<"ki" | "json">("ki");

  return (
    <ActionDialog onClose={onClose} breit>
      <div className="space-y-4 p-5">
        <h3 className="text-base font-semibold">
          {vorhanden ? "Guide ersetzen" : "Guide erstellen"}
        </h3>
        <p className="text-sm text-[var(--color-muted)]">
          {vorhanden
            ? "Der neue Guide ersetzt deinen bisherigen auf der gewählten Ebene — der alte Stand wandert in den Verlauf."
            : "Ein FAQ- und Troubleshooting-Guide für dieses Modell: Plattform-Erkennung, Fehlersuche nach Subsystemen, bekannte Serienfehler, Wartung."}
        </p>

        <div
          role="tablist"
          aria-label="Erstellungsweg"
          className="inline-flex flex-wrap gap-1 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1 text-sm"
        >
          {MODI.map((m) => {
            const Icon = m.icon;
            const aktiv = modus === m.key;
            return (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={aktiv}
                onClick={() => setModus(m.key)}
                className={`inline-flex items-center gap-1.5 rounded-[calc(var(--radius)-2px)] px-3 py-1.5 transition-colors ${
                  aktiv
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                }`}
              >
                <Icon size={15} /> {m.label}
              </button>
            );
          })}
        </div>

        {modus === "ki" ? (
          <TroubleshootingGenerate
            machineId={machineId}
            vorhanden={vorhanden}
            providers={providers}
            centralKey={centralKey}
            generation={generation}
            onErfolg={onClose}
          />
        ) : (
          <TroubleshootingJsonImport
            machineId={machineId}
            prompt={prompt}
            vorhanden={vorhanden}
            generation={generation}
            onErfolg={onClose}
          />
        )}
      </div>
    </ActionDialog>
  );
}
