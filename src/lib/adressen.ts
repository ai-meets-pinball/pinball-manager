/*
  Adresslisten aus einem Textfeld lesen (Einladungs-Rundmail): eine Adresse je
  Zeile, Komma oder Semikolon; getrimmt, kleingeschrieben, ohne Doppelte.
  Rein, damit die Regel (was ist gültig, wie wird getrennt) testbar bleibt —
  die Action lädt danach je gültiger Adresse ein.
*/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const MAX_ADRESSEN = 50;

export function parseAdressen(text: string): {
  gueltig: string[];
  ungueltig: string[];
  /** Über MAX_ADRESSEN hinaus abgeschnittene gültige Adressen. */
  zuViele: number;
} {
  const gesehen = new Set<string>();
  const gueltig: string[] = [];
  const ungueltig: string[] = [];
  for (const roh of text.split(/[\n,;]+/)) {
    const a = roh.trim().toLowerCase();
    if (!a) continue;
    if (!EMAIL.test(a)) {
      if (!ungueltig.includes(a)) ungueltig.push(a);
      continue;
    }
    if (gesehen.has(a)) continue;
    gesehen.add(a);
    gueltig.push(a);
  }
  const zuViele = Math.max(0, gueltig.length - MAX_ADRESSEN);
  return { gueltig: gueltig.slice(0, MAX_ADRESSEN), ungueltig, zuViele };
}
