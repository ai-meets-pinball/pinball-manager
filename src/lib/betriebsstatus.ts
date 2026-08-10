/*
  Betriebsstatus einer Maschine (Begriffe: CONTEXT.md) — die reine Regel,
  ohne Datenbank.

  Der Status ist HYBRID: normalerweise aus den offenen Fehlern abgeleitet,
  auf Wunsch von Hand gepinnt. Beides entscheidet `naechsterStatus`; die
  Action in db/actions/machine-status.ts lädt nur noch und schreibt.

  `ausser_betrieb` wird nie abgeleitet — es lässt sich nur von Hand setzen.
  Der Automatik-Pfad kennt genau zwei Ergebnisse.
*/

export const BETRIEBSSTATUS = [
  "spielbereit",
  "eingeschraenkt",
  "ausser_betrieb",
] as const;

export type Betriebsstatus = (typeof BETRIEBSSTATUS)[number];

/** Von harmlos nach schwer — die eine Reihenfolge für Sortierung und Vergleich. */
export const STATUS_ORDNUNG: readonly Betriebsstatus[] = BETRIEBSSTATUS;

/** Anzeigenamen — eine Quelle für Badge, Auswahlfeld und Übersicht. */
export const STATUS_LABEL: Record<Betriebsstatus, string> = {
  spielbereit: "Spielbereit",
  eingeschraenkt: "Eingeschränkt",
  ausser_betrieb: "Außer Betrieb",
};

/** Ein Fehler zählt als offen, solange er nicht behoben ist. */
function istOffen(fehler: { status: string }): boolean {
  return fehler.status !== "behoben";
}

/** Status, wie er sich aus den Fehlern einer Maschine ergibt. */
export function abgeleiteterStatus(
  fehler: { prioritaet: string; status: string }[],
): Betriebsstatus {
  const kritischOffen = fehler.some(
    (f) => f.prioritaet === "kritisch" && istOffen(f),
  );
  return kritischOffen ? "eingeschraenkt" : "spielbereit";
}

/** Schwerster Status einer Menge — für die Gesamtlage einer Flotte. */
export function schwerster(
  statuses: readonly Betriebsstatus[],
): Betriebsstatus | null {
  return statuses.reduce<Betriebsstatus | null>(
    (schlimmster, s) =>
      schlimmster === null ||
      STATUS_ORDNUNG.indexOf(s) > STATUS_ORDNUNG.indexOf(schlimmster)
        ? s
        : schlimmster,
    null,
  );
}

/**
 * Auf welchen Status die Maschine wechseln muss — `null`, wenn nichts zu tun
 * ist. Zwei Gründe für „nichts zu tun": der Status ist von Hand gepinnt, oder
 * der abgeleitete Status ist bereits gesetzt (dann darf `statusSeit` auch
 * nicht gebumpt werden, sonst lügt der „Seit"-Ticker).
 */
export function naechsterStatus(
  maschine: { status: string; statusManuell: boolean },
  fehler: { prioritaet: string; status: string }[],
): Betriebsstatus | null {
  if (maschine.statusManuell) return null;
  const neu = abgeleiteterStatus(fehler);
  return neu === maschine.status ? null : neu;
}
