/*
  Kleine Regeln für Tabellen-Spalten. Rein: keine DB, kein React — damit die
  Entscheidung „diese Spalte sagt nichts" testbar bleibt und nicht im JSX
  versteckt liegt.
*/

/**
 * Tragen ALLE Zeilen denselben Wert? Dann wiederholt die Spalte nur, was der
 * Filter oben schon sagt, und kann weg. Bei null oder einer Zeile bewusst
 * `false`: dort ist der Wert die einzige Auskunft, die die Spalte gibt.
 */
export function spalteEinheitlich<T>(
  zeilen: T[],
  wert: (zeile: T) => string,
): boolean {
  if (zeilen.length < 2) return false;
  const erster = wert(zeilen[0]);
  return zeilen.every((z) => wert(z) === erster);
}
