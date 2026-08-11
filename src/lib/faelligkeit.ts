/*
  Fälligkeit von Wartungspunkten — die EINE Stelle, an der „fällig", „bald" und
  „überfällig" definiert sind (Begriffe: CONTEXT.md).

  Vorher war dieselbe Regel dreifach kodiert: einmal in TypeScript und zweimal
  als SQL-Grenze. Dass die drei übereinstimmten, war nicht abgesichert. Hier
  liegen deshalb sowohl die Einstufung eines einzelnen Punktes (`faelligkeit`)
  als auch die Zeitpunkte, gegen die SQL filtert (`faelligBis`, `baldBis`).

  Verglichen wird auf KALENDERTAGE, nicht auf Zeitstempel: ein Punkt mit Termin
  „heute 18:00" ist den ganzen Tag über fällig, nicht erst ab 18:00. Nur so
  ergibt auch die Anzeige „seit 3 Tagen fällig" einen Sinn.

  Zeitzone ist fest Europe/Berlin. Der Server läuft auf Vercel in UTC, die
  Nutzer stehen in Deutschland an der Maschine — ohne feste Zone würde „fällig"
  jede Nacht für ein bis zwei Stunden falsch kippen.

  Rein: kein Datenbankzugriff, keine Server-Umgebung. Deshalb direkt testbar
  (faelligkeit.test.ts).
*/

const ZEITZONE = "Europe/Berlin";
const TAG_MS = 86_400_000;

/** Innerhalb dieses Fensters (Tage) gilt ein Termin als „bald fällig". */
const BALD_TAGE = 14;

export type FaelligkeitsStatus = "faellig" | "bald" | "ok" | "kein-termin";

/** Kalendertag in Berliner Zeit, als "YYYY-MM-DD" (en-CA liefert genau das). */
function berlinerTag(zeitpunkt: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZEITZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(zeitpunkt);
}

/** "YYYY-MM-DD" auf die UTC-Mitternacht abbilden — nur zum Tage-Zählen. */
function tagesZahl(tag: string): number {
  return Date.parse(`${tag}T00:00:00Z`);
}

/** Abstand der Berliner Zeitzone zu UTC im gegebenen Moment, in Millisekunden. */
function zonenAbstand(zeitpunkt: Date): number {
  const teile = new Intl.DateTimeFormat("en-US", {
    timeZone: ZEITZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(zeitpunkt);
  const wert = (typ: string) =>
    Number(teile.find((t) => t.type === typ)?.value ?? 0);
  const alsWaereEsUtc = Date.UTC(
    wert("year"),
    wert("month") - 1,
    wert("day"),
    wert("hour") % 24, // manche ICU-Versionen liefern "24" für Mitternacht
    wert("minute"),
    wert("second"),
  );
  return alsWaereEsUtc - Math.floor(zeitpunkt.getTime() / 1000) * 1000;
}

/** Mitternacht (Berliner Zeit) des Tages, den `tagesZahl` bezeichnet. */
function berlinerMitternacht(zahl: number): Date {
  // Zwei Runden, damit eine Zeitumstellung zwischen Schätzung und Ziel nicht
  // danebengreift: die erste Schätzung liefert den Abstand am richtigen Tag.
  const grob = new Date(zahl - zonenAbstand(new Date(zahl)));
  return new Date(zahl - zonenAbstand(grob));
}

/** Ganze Kalendertage von `von` bis `bis`, Berliner Zeit. Negativ = Vergangenheit. */
export function tageDazwischen(von: Date, bis: Date): number {
  return Math.round(
    (tagesZahl(berlinerTag(bis)) - tagesZahl(berlinerTag(von))) / TAG_MS,
  );
}

/** Datum plus Tage, Uhrzeit bleibt erhalten. */
function addDays(basis: Date, tage: number): Date {
  const d = new Date(basis);
  d.setDate(d.getDate() + tage);
  return d;
}

/** Nächster Termin ab einem Zeitpunkt — nur zeitbasierte Intervalle haben einen. */
export function naechsterTermin(
  intervallTyp: string,
  intervallTage: number | null,
  ab: Date,
): Date | null {
  return intervallTyp === "zeit" && intervallTage && intervallTage > 0
    ? addDays(ab, intervallTage)
    : null;
}

/** Einstufung eines Wartungspunktes zum Zeitpunkt `jetzt`. */
export function faelligkeit(
  punkt: { intervallTyp: string; naechsteFaelligkeit: Date | null },
  jetzt: Date,
): { status: FaelligkeitsStatus; tageBisFaellig: number | null } {
  if (punkt.intervallTyp !== "zeit" || !punkt.naechsteFaelligkeit) {
    return { status: "kein-termin", tageBisFaellig: null };
  }
  const tageBisFaellig = tageDazwischen(jetzt, punkt.naechsteFaelligkeit);
  if (tageBisFaellig <= 0) return { status: "faellig", tageBisFaellig };
  if (tageBisFaellig <= BALD_TAGE) return { status: "bald", tageBisFaellig };
  return { status: "ok", tageBisFaellig };
}

/** Intervall eines Wartungspunktes in Worten — für Plan und Vorlage gleich. */
export function intervallLabel(punkt: {
  intervallTyp: string;
  intervallTage: number | null;
  intervallText: string | null;
}): string {
  if (punkt.intervallText) return punkt.intervallText;
  if (punkt.intervallTyp === "zeit" && punkt.intervallTage)
    return `alle ${punkt.intervallTage} Tage`;
  if (punkt.intervallTyp === "spiele") return "nach Spielzahl";
  return "bei Bedarf";
}

/** Obergrenze für SQL: alles bis hier ist „fällig" (Ende des heutigen Tages). */
export function faelligBis(jetzt: Date): Date {
  const morgen = tagesZahl(berlinerTag(jetzt)) + TAG_MS;
  return new Date(berlinerMitternacht(morgen).getTime() - 1);
}

/** Obergrenze für SQL: alles bis hier ist „fällig" ODER „bald". */
export function baldBis(jetzt: Date): Date {
  const danach = tagesZahl(berlinerTag(jetzt)) + (BALD_TAGE + 1) * TAG_MS;
  return new Date(berlinerMitternacht(danach).getTime() - 1);
}
