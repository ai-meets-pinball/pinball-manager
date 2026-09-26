/*
  Nutzungsübersicht — die reinen Regeln (kein DB, keine headers()):
  - welcher Kalendertag zählt als „aktiver Tag" (UTC-Datum, damit Server und
    Datenbank denselben Tag meinen),
  - ab wann ein Zeitraum-Chip zählt (7/30/90 Tage oder alles).
  Die Seite /admin/nutzung und lib/session.ts rufen sie; getestet in
  nutzung.test.ts.
*/
export const ZEITRAEUME = ["7", "30", "90", "alle"] as const;
export type Zeitraum = (typeof ZEITRAEUME)[number];

export const ZEITRAUM_LABEL: Record<Zeitraum, string> = {
  "7": "7 Tage",
  "30": "30 Tage",
  "90": "90 Tage",
  alle: "Gesamt",
};

/** Ungültige/fehlende Eingabe → Standard 30 Tage. */
export function zeitraumAusParam(wert: string | undefined | null): Zeitraum {
  return (ZEITRAEUME as readonly string[]).includes(wert ?? "")
    ? (wert as Zeitraum)
    : "30";
}

/** Untere Grenze des Zeitraums — null bei „alle" (kein Filter). */
export function zeitraumAb(zeitraum: Zeitraum, jetzt: Date = new Date()): Date | null {
  if (zeitraum === "alle") return null;
  const tage = Number(zeitraum);
  return new Date(jetzt.getTime() - tage * 24 * 60 * 60_000);
}

/** Kalendertag in UTC als ISO-Datum (YYYY-MM-DD) — der Schlüssel in nutzung_tage. */
export function heuteUtc(jetzt: Date = new Date()): string {
  return jetzt.toISOString().slice(0, 10);
}
