/*
  „Klebende" Ansicht-/Filter-Auswahlen: Der URL-Parameter ist maßgeblich (wenn
  gültig), sonst der zuletzt in einem Cookie gemerkte Wert, sonst der Default.
  Die Seiten setzen ihre Steuer-Links IMMER mit allen gemerkten Parametern (auch
  Defaults) — so lässt sich jeder Wert wieder wählen, während ein von einem
  Hilfs-Link (Suche/Seite) weggelassener Parameter auf den gemerkten Cookie-Wert
  zurückfällt. Ergebnis: die Auswahl bleibt über Navigation UND Sessions.
*/
export function klebrig(
  url: string | undefined,
  cookie: string | undefined,
  gueltig: (v: string) => boolean,
  fallback: string,
): string {
  if (url !== undefined && gueltig(url)) return url;
  if (cookie !== undefined && gueltig(cookie)) return cookie;
  return fallback;
}
