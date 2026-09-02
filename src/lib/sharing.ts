/*
  Begriffe und Anzeigetexte rund um geteiltes Wissen.

  Diese Datei ist bewusst FREI von Datenbank-Imports — der Teilen-Dialog ist
  eine Client-Komponente und nutzt SHARE_SCOPES/SCOPE_LABEL. Zieht man hier
  `db` herein, landet der Postgres-Treiber im Client-Bundle und der Build
  bricht ("Module not found: Can't resolve 'fs'").

  Die eigentliche Sichtbarkeitsregel (shareVisibilityFilter)
  steht in db/queries.ts — direkt neben getVisibleMachines, weil beide
  Regeln zusammengehören und gemeinsam geändert werden müssen.
*/

export const SHARE_SCOPES = ["platform", "club", "users"] as const;
export type ShareScope = (typeof SHARE_SCOPES)[number];

export const SCOPE_LABEL: Record<ShareScope, string> = {
  platform: "Alle angemeldeten Nutzer",
  club: "Bestimmte Clubs",
  users: "Bestimmte Personen",
};

export const SCOPE_HINWEIS: Record<ShareScope, string> = {
  platform:
    "Jede angemeldete Person sieht die Daten. Kein Zugriff aus dem offenen Internet.",
  club: "Nur Mitglieder der gewählten Clubs.",
  users: "Nur die ausdrücklich benannten Personen — unabhängig von Clubs.",
};

export const ARTEFAKT_TYPEN = ["machine_facts", "repair"] as const;
export type ArtefaktTyp = (typeof ARTEFAKT_TYPEN)[number];

/** Anzeigename der Herkunft — respektiert das Anonym-Flag der Freigabe. */
export function herkunftLabel(
  share: { anonym: boolean },
  ownerName: string | null,
): string {
  return share.anonym ? "anonym geteilt" : (ownerName ?? "unbekannt");
}

/*
  Reine Regeln für den Teilen-Dialog — UI (Knopf deaktiviert + Grund) und
  Action (Ablehnung als FormState) prüfen dasselbe.
*/

/** Eine Freigabe, wie Dialog und Action sie sehen: Reichweite, Flags, Ziele. */
export type FreigabeEntwurf = {
  scope: ShareScope;
  anonym: boolean;
  zeigeKosten: boolean;
  clubIds: string[];
  emails: string[];
};

/** Kommagetrennte E-Mail-Eingabe → normalisierte Liste (klein, ohne Leere). */
export function emailsAusText(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Fehlt der Freigabe ein Empfänger? Grund als Text, sonst null. */
export function freigabeZielFehlt(e: {
  scope: ShareScope;
  clubIds: string[];
  emails: string[];
}): string | null {
  if (e.scope === "club" && e.clubIds.length === 0)
    return "Bitte mindestens einen Club wählen.";
  if (e.scope === "users" && e.emails.length === 0)
    return "Bitte mindestens eine E-Mail angeben.";
  return null;
}

/** Entspricht der Entwurf der gespeicherten Freigabe? Reihenfolge der Ziele
    ist egal; Ziele der jeweils anderen Reichweiten zählen nicht mit. */
export function freigabeUnveraendert(
  aktuell: FreigabeEntwurf,
  entwurf: FreigabeEntwurf,
): boolean {
  if (aktuell.scope !== entwurf.scope) return false;
  if (aktuell.anonym !== entwurf.anonym) return false;
  if (aktuell.zeigeKosten !== entwurf.zeigeKosten) return false;
  if (entwurf.scope === "club") return gleicheMenge(aktuell.clubIds, entwurf.clubIds);
  if (entwurf.scope === "users") return gleicheMenge(aktuell.emails, entwurf.emails);
  return true;
}

function gleicheMenge(a: string[], b: string[]): boolean {
  const sa = new Set(a);
  const sb = new Set(b);
  return sa.size === sb.size && [...sa].every((x) => sb.has(x));
}
