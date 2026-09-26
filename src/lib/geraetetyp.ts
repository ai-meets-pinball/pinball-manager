/*
  Grober Gerätetyp aus dem User-Agent — für das Login-Protokoll der
  Nutzungsübersicht. Bewusst grob (Handy/Tablet/Desktop · Browser-Familie),
  kein Fingerprint: Es geht darum zu sehen, ob jemand am Gerät (Handy) oder am
  Schreibtisch arbeitet. Unbekanntes wird nicht geraten (null).
*/
export function geraetetyp(userAgent: string | null | undefined): string | null {
  const ua = (userAgent ?? "").trim();
  if (!ua) return null;

  const klasse = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua)
    ? "Tablet"
    : /Mobi|iPhone|Android/i.test(ua)
      ? "Handy"
      : "Desktop";

  // Reihenfolge ist load-bearing: Chrome-Derivate und Safari nennen sich
  // gegenseitig im UA-String (Chrome enthält "Safari", Edge enthält "Chrome").
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\/|CriOS\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : null;

  return browser ? `${klasse} · ${browser}` : klasse;
}
