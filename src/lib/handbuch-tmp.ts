/*
  Große Handbücher (Frank 2026-11-20: „Make prod accept big PDFs"): Vercel nimmt
  pro Anfrage höchstens 4,5 MB an. Größere PDFs lädt der Browser deshalb direkt
  in einen PRIVATEN Blob-Store (eigener Token HANDBUCH_BLOB_READ_WRITE_TOKEN,
  nicht der öffentliche Foto-Store); die Extraktions-Route liest das PDF dort,
  wertet es aus und löscht es sofort wieder (lib/handbuch-route.ts).

  Die Copyright-Leitplanke (PRD §6) wird dadurch von „nie gespeichert" zu
  „nur für die Minuten der Auswertung, nur privat, danach gelöscht". Kleine
  PDFs gehen weiter direkt durchs Formular und werden gar nicht abgelegt.

  Reine Regel, ohne Blob-SDK und ohne DB: Ordner, Grenzen, welcher Pfad einem
  Nutzer gehört und welche liegengebliebenen PDFs der Aufräum-Job löscht.
*/

const MB = 1024 * 1024;

export const HANDBUCH_TMP_ORDNER = "handbuch-tmp/";

/** Bis zu dieser Größe geht das PDF direkt mit (Luft unter Vercels 4,5 MB für die übrigen Felder). */
export const DIREKT_MAX_BYTES = 4 * MB;

/** Obergrenze überhaupt — dieselbe wie in lib/manual-extract.ts. */
export const HANDBUCH_MAX_BYTES = 50 * MB;

/** Länger als eine Auswertung dauern kann (maxDuration 300 s) — danach gilt ein PDF als liegengeblieben. */
export const HANDBUCH_TMP_SCHONFRIST_MS = 60 * 60 * 1000;

export function handbuchTmpPraefix(userId: string): string {
  return `${HANDBUCH_TMP_ORDNER}${userId}/`;
}

/** Ein Dateiname: ein einziges Segment, keine Pfad-Tricks. */
const DATEINAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.pdf$/;

/** Liegt der Pfad im eigenen Ordner dieses Nutzers? Gilt für Token und Auswertung. */
export function pruefeHandbuchPfad(userId: string, pfad: string): boolean {
  const praefix = handbuchTmpPraefix(userId);
  if (!userId || !pfad.startsWith(praefix)) return false;
  return DATEINAME.test(pfad.slice(praefix.length));
}

/** PDFs, die länger als die Schonfrist liegen — die Auswertung hat sie nicht gelöscht. */
export function abgelaufeneHandbuecher<B extends { pathname: string; uploadedAt: Date }>(
  blobs: readonly B[],
  jetzt: Date,
): B[] {
  const grenze = jetzt.getTime() - HANDBUCH_TMP_SCHONFRIST_MS;
  return blobs.filter(
    (b) => b.pathname.startsWith(HANDBUCH_TMP_ORDNER) && b.uploadedAt.getTime() < grenze,
  );
}
