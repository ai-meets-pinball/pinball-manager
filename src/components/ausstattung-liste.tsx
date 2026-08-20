import { Package } from "lucide-react";

/*
  Ausstattung/Add-ons im Kopf der Maschinen-Detailseite — reine ANZEIGE. Was an
  genau diesem Gerät zusätzlich verbaut/dabei ist (Shaker, Topper, farbige LEDs
  …), rein informativ wie die Besitzer-Zeile daneben. Gepflegt wird die Liste im
  Bearbeiten-Formular der Maschine (machine-form.tsx), nicht hier — darum ohne
  Aktionen und ohne "use client". Ist die Liste leer, zeigt die Zeile nichts.
*/
type Eintrag = { id: string; name: string; notiz: string | null };

export function AusstattungListe({ ausstattung }: { ausstattung: Eintrag[] }) {
  if (ausstattung.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--color-muted)]">
      <span className="inline-flex items-center gap-1">
        <Package size={14} /> Ausstattung:
      </span>
      {/* Einträge mit | getrennt (wie „Modell | Hersteller"), Notiz in Klammern
          — Feedback: nur Leerzeichen war schwer lesbar (Averell, c2b8a536). */}
      <span className="text-[var(--color-fg)]">
        {ausstattung.map((a, i) => (
          <span key={a.id}>
            {i > 0 ? (
              <span className="text-[var(--color-faint)]"> | </span>
            ) : null}
            {a.name}
            {a.notiz ? (
              <span className="text-[var(--color-muted)]"> ({a.notiz})</span>
            ) : null}
          </span>
        ))}
      </span>
    </div>
  );
}
