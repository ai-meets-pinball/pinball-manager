/*
  DIE eine Schreibweise für Automaten-Namen in der Anzeige: das MODELL zuerst
  (das ist, wonach man sucht und spricht), der Hersteller dahinter —
  „Fireball | Bally" statt „Bally Fireball". Überall über diesen Helfer,
  damit die Konvention an EINER Stelle lebt.
*/
export function modellName(m: { hersteller: string; modell: string }): string {
  return `${m.modell} | ${m.hersteller}`;
}

/*
  Initialen eines Nutzers für den Avatar-Fallback: explizit gesetzte `initials`
  gewinnen; sonst erste Buchstaben von Vor- und Nachname; sonst die ersten
  Buchstaben der ersten beiden Namens-Wörter; Notnagel: erster Buchstabe der
  E-Mail.
*/
export function initialen(u: {
  initials?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
}): string {
  if (u.initials?.trim()) return u.initials.trim().toUpperCase();
  const vor = u.firstName?.trim()?.[0] ?? "";
  const nach = u.lastName?.trim()?.[0] ?? "";
  if (vor || nach) return `${vor}${nach}`.toUpperCase();
  const worte = (u.name ?? "").trim().split(/\s+/).filter(Boolean);
  if (worte.length > 0) {
    return worte
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }
  return (u.email?.[0] ?? "?").toUpperCase();
}

/*
  Relative Zeitangabe für die Anzeige („vor 7 Tagen"). Bewusst tagegenau (über
  lokale Mitternacht gerechnet), nicht sekundengenau — für „Letzte Wartung"
  o. Ä. Reine Date-Mathematik, keine Bibliothek.
*/
export function relativeZeit(d: Date, jetzt: Date = new Date()): string {
  const tag = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const tage = Math.round((tag(jetzt) - tag(d)) / 86_400_000);
  if (tage < 0) return "in der Zukunft";
  if (tage === 0) return "heute";
  if (tage === 1) return "gestern";
  if (tage < 7) return `vor ${tage} Tagen`;
  if (tage < 14) return "vor 1 Woche";
  if (tage < 30) return `vor ${Math.floor(tage / 7)} Wochen`;
  if (tage < 60) return "vor 1 Monat";
  if (tage < 365) return `vor ${Math.floor(tage / 30)} Monaten`;
  const jahre = Math.floor(tage / 365);
  return jahre === 1 ? "vor 1 Jahr" : `vor ${jahre} Jahren`;
}

/** „1 Mitglied" / „3 Mitglieder" — statt „3 Mitglied(er)". */
export function anzahl(n: number, einzahl: string, mehrzahl: string): string {
  return `${n} ${n === 1 ? einzahl : mehrzahl}`;
}

/**
 * Datum als „YYYY-MM-DD" in LOKALER Zeit — für <input type="date">. `toISOString()`
 * liefert UTC und kippt in Europa abends auf den Vortag.
 */
export function datumISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const t = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${t}`;
}
