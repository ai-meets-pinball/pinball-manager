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
