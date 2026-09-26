/*
  Besitzer-Katalog — die reinen Regeln für die Verwaltung auf der Club-Seite
  (umbenennen, verknüpfen, zusammenführen, löschen). Die Actions in
  db/actions/besitzer.ts laden nur und schreiben; entschieden wird hier.
*/

type Kontakt = { email: string | null; userId: string | null };

/** Felder des Ziels nach dem Zusammenführen: das Ziel gewinnt, die Quelle füllt
    nur Lücken. Zwei VERSCHIEDENE Konten lassen sich nicht zusammenführen — das
    wären zwei Personen. */
export function zusammengefuehrt(
  ziel: Kontakt,
  quelle: Kontakt,
): Kontakt | { error: string } {
  if (ziel.userId && quelle.userId && ziel.userId !== quelle.userId) {
    return {
      error:
        "Beide Einträge sind mit verschiedenen Konten verknüpft — das sind zwei Personen.",
    };
  }
  return {
    email: ziel.email ?? quelle.email ?? null,
    userId: ziel.userId ?? quelle.userId ?? null,
  };
}

/** Grund, warum ein Eintrag nicht gelöscht werden darf — oder null. */
export function besitzerLoeschenGesperrt(maschinen: number): string | null {
  if (maschinen <= 0) return null;
  return `Hängt an ${maschinen} Maschine${maschinen === 1 ? "" : "n"} — erst zusammenführen oder dort entfernen.`;
}

export const BESITZER_NAME_MAX = 80;
