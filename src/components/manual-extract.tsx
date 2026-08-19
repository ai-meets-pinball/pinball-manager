"use client";

import { useState } from "react";
import { Cpu, FileJson } from "lucide-react";
import { ManualJsonImport } from "@/components/manual-json-import";
import { ManualUpload } from "@/components/manual-upload";
import type { AiProvider } from "@/lib/ai/provider";

/*
  Handbuch-Fakten per KI extrahieren — zwei Wege für DASSELBE Ziel, nur an
  unterschiedlichem Ort: entweder die App wertet das PDF aus, oder du nutzt dein
  eigenes ChatGPT-/Claude-Abo und fügst das fertige JSON ein. Beides ist
  KI-Extraktion; die Umschaltung zeigt jeweils nur den passenden Weg.
*/
const MODI = [
  { key: "app" as const, label: "In der App", icon: Cpu },
  { key: "abo" as const, label: "Eigenes ChatGPT-/Claude-Abo", icon: FileJson },
];

export function ManualExtract({
  machineId,
  providers,
  centralKey,
}: {
  machineId: string;
  providers: AiProvider[];
  centralKey: boolean;
}) {
  const [modus, setModus] = useState<"app" | "abo">("app");

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-muted)]">
        Referenztabellen (Spulen, Lampen-/Schalter-Matrix, Sicherungen, Teile,
        Regeln, Schrauben, Gummi, Elektronik) werden per KI aus dem Handbuch
        gezogen — entweder direkt in der
        App (das PDF wird nicht gespeichert, nur die Fakten) oder mit deinem
        eigenen ChatGPT-/Claude-Abo.
      </p>

      <div className="inline-flex flex-wrap gap-1 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1 text-sm">
        {MODI.map((m) => {
          const Icon = m.icon;
          const aktiv = modus === m.key;
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={aktiv}
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

      {modus === "app" ? (
        <ManualUpload
          machineId={machineId}
          providers={providers}
          centralKey={centralKey}
        />
      ) : (
        <ManualJsonImport machineId={machineId} />
      )}
    </div>
  );
}
