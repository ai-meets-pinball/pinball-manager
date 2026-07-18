import { BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

/*
  Reparaturdatenbank je Gerätetyp: von anderen Besitzern geteilte Reparaturen,
  ausschließlich lesend.

  Wichtig: Kosten/Aufwand und Herkunft sind hier bereits NICHT MEHR vorhanden,
  wenn die jeweilige Freigabe sie verbirgt — die Projektion passiert
  serverseitig in getSharedRepairsForModel. Diese Komponente kann also gar
  nichts ausplaudern, was nicht freigegeben wurde.
*/
export function SharedRepairs({
  eintraege,
}: {
  eintraege: {
    shareId: string;
    datum: Date;
    status: string;
    diagnose: string | null;
    massnahme: string | null;
    teile: string | null;
    faultBeschreibung: string | null;
    faultKategorie: string | null;
    kosten: string | null;
    zeit: number | null;
    herkunft: string | null;
  }[];
}) {
  if (eintraege.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BookOpen size={18} className="text-[var(--color-accent)]" />
          Geteiltes Wissen ({eintraege.length})
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          Reparaturen anderer Besitzer desselben Automaten — nur lesend.
        </p>
      </div>

      <div className="space-y-2">
        {eintraege.map((e) => (
          <Card key={e.shareId} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusBadge value={e.status} />
                {e.faultKategorie ? (
                  <span className="text-xs text-[var(--color-muted)]">
                    {e.faultKategorie}
                  </span>
                ) : null}
              </div>
              <span className="font-mono text-xs text-[var(--color-faint)]">
                {new Date(e.datum).toLocaleDateString("de-DE")} ·{" "}
                {e.herkunft ?? "anonym"}
              </span>
            </div>

            {e.faultBeschreibung ? (
              <p className="text-sm">
                <span className="text-[var(--color-muted)]">Symptom: </span>
                {e.faultBeschreibung}
              </p>
            ) : null}
            {e.diagnose ? (
              <p className="text-sm whitespace-pre-wrap">
                <span className="text-[var(--color-muted)]">Diagnose: </span>
                {e.diagnose}
              </p>
            ) : null}
            {e.massnahme ? (
              <p className="text-sm whitespace-pre-wrap">
                <span className="text-[var(--color-muted)]">Maßnahme: </span>
                {e.massnahme}
              </p>
            ) : null}
            {e.teile ? (
              <p className="text-sm">
                <span className="text-[var(--color-muted)]">Teile: </span>
                {e.teile}
              </p>
            ) : null}

            {e.kosten !== null || e.zeit !== null ? (
              <p className="font-mono text-xs text-[var(--color-faint)]">
                {e.kosten !== null ? `${e.kosten} €` : null}
                {e.kosten !== null && e.zeit !== null ? " · " : null}
                {e.zeit !== null ? `${e.zeit} Min.` : null}
              </p>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}
