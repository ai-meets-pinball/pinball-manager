/*
  Missbrauchsschutz für KI-Aufrufe über den Plattform-Schlüssel (Security-
  Audit 2026-09-13): der Reparaturvorschlag steht ALLEN Nutzern offen, und
  ohne Schranke könnte ein Skript in Schleife Kosten treiben. Die Regel ist
  rein; die Zahl der Aufrufe im Fenster liefert die Action aus `ki_aufrufe`.

  Super-Admins sind ausgenommen — sie zahlen die Rechnung selbst und nutzen
  die KI auch für Handbuch und Guide.
*/
export const KI_LIMIT = { max: 20, fensterMinuten: 60 } as const;

export function kiLimit(
  aufrufeImFenster: number,
  istSuperAdmin: boolean,
  limit: { max: number; fensterMinuten: number } = KI_LIMIT,
): { erlaubt: true } | { erlaubt: false; grund: string } {
  if (istSuperAdmin) return { erlaubt: true };
  if (aufrufeImFenster < limit.max) return { erlaubt: true };
  return {
    erlaubt: false,
    grund: `Limit erreicht: höchstens ${limit.max} KI-Vorschläge je ${limit.fensterMinuten} Minuten. Bitte später noch einmal — oder den Vorschlag von Hand ausformulieren.`,
  };
}
