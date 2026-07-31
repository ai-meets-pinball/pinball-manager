/*
  DIE eine Schreibweise für Automaten-Namen in der Anzeige: das MODELL zuerst
  (das ist, wonach man sucht und spricht), der Hersteller dahinter —
  „Fireball | Bally" statt „Bally Fireball". Überall über diesen Helfer,
  damit die Konvention an EINER Stelle lebt.
*/
export function modellName(m: { hersteller: string; modell: string }): string {
  return `${m.modell} | ${m.hersteller}`;
}
