/*
  Begriffe und Anzeigetexte rund um geteiltes Wissen.

  Diese Datei ist bewusst FREI von Datenbank-Imports — der Teilen-Dialog ist
  eine Client-Komponente und nutzt SHARE_SCOPES/SCOPE_LABEL. Zieht man hier
  `db` herein, landet der Postgres-Treiber im Client-Bundle und der Build
  bricht ("Module not found: Can't resolve 'fs'").

  Die eigentliche Sichtbarkeitsregel (shareVisibilityFilter / canSeeShare)
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
