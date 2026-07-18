import { Users } from "lucide-react";
import { MachineDataTables } from "@/components/machine-data-tables";
import { herkunftLabel } from "@/lib/sharing";

/*
  Von anderen Besitzern desselben Gerätetyps geteilte Handbuch-Fakten —
  ausschließlich lesend. Es gibt bewusst keine Bearbeiten-/Übernehmen-Aktion:
  die Daten gehören dem Urheber, und Kopien würden auseinanderdriften.

  Hat man noch keine eigenen Fakten, ist der Abschnitt aufgeklappt — genau dann
  ist er der Ersatz für eine eigene (kostenpflichtige) Extraktion.
*/
export function SharedFacts({
  eintraege,
  eigeneVorhanden,
}: {
  eintraege: {
    shareId: string;
    anonym: boolean;
    ownerName: string | null;
    hersteller: string;
    modell: string;
    fakten: { typ: string; daten: unknown }[];
  }[];
  eigeneVorhanden: boolean;
}) {
  const mitFakten = eintraege.filter((e) => e.fakten.length > 0);
  if (mitFakten.length === 0) return null;

  return (
    <div className="space-y-3">
      {mitFakten.map((e) => (
        <details
          key={e.shareId}
          open={!eigeneVorhanden}
          className="group overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)]"
        >
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2 hover:bg-[var(--color-inset)]">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Users size={15} className="text-[var(--color-accent)]" />
              Geteilte Handbuch-Daten
              <span className="font-normal text-[var(--color-muted)]">
                · {herkunftLabel(e, e.ownerName)}
              </span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-[var(--color-faint)]">
              nur lesen
            </span>
          </summary>
          <div className="border-t border-[var(--color-border)] p-3">
            {!eigeneVorhanden ? (
              <p className="mb-3 text-sm text-[var(--color-muted)]">
                Für diesen Automaten liegen bereits ausgewertete Handbuch-Daten
                vor — du musst dafür kein eigenes Handbuch hochladen.
              </p>
            ) : null}
            <MachineDataTables facts={e.fakten} />
          </div>
        </details>
      ))}
    </div>
  );
}
