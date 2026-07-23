"use client";

import { useState } from "react";
import { Cloud, Cpu, Zap } from "lucide-react";
import { ApiKeyField } from "@/components/ui/api-key-field";
import type { AiProvider } from "@/lib/ai/provider";

/*
  Bewusste Anbieter-Wahl je KI-Aktion. Sind beide Wege verfügbar (lokales Ollama
  UND Claude), zeigt sich eine Umschaltung; sonst gibt es nichts zu wählen und die
  Komponente reicht nur den einen Anbieter (versteckt) durch. Der Claude-Weg
  blendet zusätzlich das ephemere BYO-Schlüsselfeld ein, wenn kein zentraler Key
  hinterlegt ist. Der gewählte Anbieter geht als Feld „provider" an die Server-
  Action (dort via resolveProvider geprüft).
*/

const META: Record<
  AiProvider,
  { label: string; hint: string; icon: typeof Cpu }
> = {
  ollama: {
    label: "Lokal (Ollama)",
    hint: "Läuft auf diesem Rechner — kein Schlüssel, Daten bleiben lokal. Langsamer, bei kleinen Modellen ungenauer.",
    icon: Cpu,
  },
  auto: {
    label: "Claude günstig (Auto)",
    hint: "Cloud, kostenoptimiert: erst das günstige Haiku, nur bei leerem Ergebnis automatisch Sonnet. Liest PDFs nativ; große Handbücher werden geteilt. Nutzt API-Schlüssel/Guthaben.",
    icon: Zap,
  },
  anthropic: {
    label: "Claude genau (Sonnet)",
    hint: "Cloud, höchste Qualität (Sonnet). Liest PDFs nativ; große Handbücher werden automatisch in Pakete geteilt. Nutzt API-Schlüssel/Guthaben; Guide mit Websuche.",
    icon: Cloud,
  },
};

export function AiProviderField({
  providers,
  centralKey,
}: {
  /** Verfügbare Anbieter (erster = Vorauswahl). */
  providers: AiProvider[];
  /** Zentraler Anthropic-Key vorhanden? Wenn nicht, braucht der Claude-Weg BYO. */
  centralKey: boolean;
}) {
  const [selected, setSelected] = useState<AiProvider>(
    providers[0] ?? "anthropic",
  );
  const mehrere = providers.length > 1;
  // Alle Claude-Stufen (Sonnet & Auto/Haiku) laufen über den Anthropic-Key.
  const braucheKey = (selected === "anthropic" || selected === "auto") && !centralKey;

  return (
    <div className="flex flex-col gap-2">
      {mehrere ? (
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Verarbeiten mit</span>
          <div role="radiogroup" className="flex flex-wrap gap-2">
            {providers.map((p) => {
              const aktiv = selected === p;
              const Icon = META[p].icon;
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={aktiv}
                  onClick={() => setSelected(p)}
                  className={`inline-flex items-center gap-1.5 rounded-[var(--radius)] border px-3 py-1.5 ${
                    aktiv
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                  }`}
                >
                  <Icon size={15} /> {META[p].label}
                </button>
              );
            })}
          </div>
          <span className="text-xs text-[var(--color-muted)]">
            {META[selected].hint}
          </span>
        </div>
      ) : null}

      {/* Der tatsächlich gewählte Anbieter geht an die Server-Action. */}
      <input type="hidden" name="provider" value={selected} />

      {braucheKey ? <ApiKeyField /> : null}
    </div>
  );
}
