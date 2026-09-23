/*
  Fehler-Mail an den Eigentümer — die reine Regel (kein DB, kein Versand).

  Wann bekommt der Eigentümer einer Maschine eine E-Mail über einen neuen
  Fehler? Nur bei PRIVATEN Maschinen (Club-Maschinen laufen über die WhatsApp-
  Benachrichtigung an Owner/Admins, db/whatsapp-benachrichtigung.ts), nur wenn
  jemand ANDERES gemeldet hat (der Eigentümer weiß es selbst), und höchstens
  alle MAIL_SPERRE_MINUTEN je Maschine: der Geräte-/Sammel-QR ist öffentlich,
  ein Gast könnte mit leicht variierten Meldungen den Posteingang fluten.
  Die Sperre wird aus den vorhandenen Fehlern berechnet (keine eigene Tabelle):
  gab es in dem Fenster schon eine Fremd-Meldung an dieser Maschine, schweigt
  die Mail — der Fehler steht ohnehin auf der Geräteseite.
*/
export const MAIL_SPERRE_MINUTEN = 30;

export function sollEigentuemerMailen(
  args: {
    clubId: string | null;
    ownerId: string;
    /** Angemeldeter Melder oder null (Gast). */
    melderId: string | null;
    /** Zeitpunkte früherer Fremd-Meldungen an dieser Maschine (ohne die neue). */
    fruehereFremdMeldungen: Date[];
  },
  jetzt: Date = new Date(),
): boolean {
  if (args.clubId !== null) return false;
  if (args.melderId === args.ownerId) return false;
  const fenster = jetzt.getTime() - MAIL_SPERRE_MINUTEN * 60_000;
  return !args.fruehereFremdMeldungen.some((d) => d.getTime() >= fenster);
}
