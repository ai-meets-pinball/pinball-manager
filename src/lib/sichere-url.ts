/*
  Sichere Link-Ziele für nutzergenerierten Text (Tipps): nur http/https/mailto.
  Verhindert `javascript:`-/`data:`-URLs, die sonst über einen anklickbaren Link
  Skripte ausführen könnten. Rein syntaktisch (kein Netzwerkzugriff), damit die
  Regel unit-testbar bleibt.

  Ohne Schema wird `https://` ergänzt — Nutzer tippen Links oft als „example.com".
  Rückgabe: normalisierte URL (`href`) oder null (= verwerfen/als Text belassen).
*/
const ERLAUBTE_PROTOKOLLE = new Set(["http:", "https:", "mailto:"]);

export function sichereUrl(roh: string): string | null {
  const s = roh.trim();
  if (!s) return null;
  // Hat die Eingabe bereits ein Schema (z. B. „http:", „mailto:")? Sonst https:.
  const kandidat = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  try {
    const url = new URL(kandidat);
    return ERLAUBTE_PROTOKOLLE.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
