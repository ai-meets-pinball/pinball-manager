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
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-muted)]">
      <span className="inline-flex items-center gap-1">
        <Package size={14} /> Ausstattung:
      </span>
      {ausstattung.map((a) => (
        <span key={a.id} className="inline-flex items-center gap-1.5">
          <span className="text-[var(--color-fg)]">{a.name}</span>
          {a.notiz ? <span>· {a.notiz}</span> : null}
        </span>
      ))}
    </div>
  );
}
