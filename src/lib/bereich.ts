/*
  Der Bereich ist die Auswahl „meine private Sammlung und/oder diese Clubs",
  mit der Dashboard und Maschinenliste ihre Zahlen und Listen einschränken.
  Nicht zu verwechseln mit dem GELTUNGSBEREICH aus CONTEXT.md — der sagt, für
  welche Maschinen ein Wissenseintrag gilt.

  Rein: die Seiten lesen den Wert aus URL bzw. Cookie und rufen diese Regel;
  gefiltert wird danach in-memory in der jeweiligen Seite.
*/

/**
 * Zerlegt die gemerkte Auswahl („privat,club-a") in gültige Schlüssel.
 * Unbekanntes fliegt raus, Duplikate ebenso; die Reihenfolge bleibt.
 *
 * Eine LEERE Antwort heißt „alle Bereiche" — kein Filter. Das gilt auch, wenn
 * nur Unbekanntes ankam (etwa ein Club, aus dem man ausgetreten ist): dann ist
 * die Auswahl gegenstandslos und alles zu zeigen ist die sichere Lesart.
 */
export function bereichKeys(
  roh: string | undefined,
  gueltig: Set<string>,
): string[] {
  if (!roh) return [];
  const gesehen = new Set<string>();
  const keys: string[] = [];
  for (const teil of roh.split(",")) {
    const k = teil.trim();
    if (!k || gesehen.has(k) || !gueltig.has(k)) continue;
    gesehen.add(k);
    keys.push(k);
  }
  return keys;
}
