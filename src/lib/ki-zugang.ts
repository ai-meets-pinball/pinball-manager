import { isSuperAdmin, type RechteNutzer } from "@/lib/rechte";

/*
  Wer darf welche KI-Funktion IN DER APP auslösen? Reine Regel (keine DB, kein
  Request) — UI (Knopf/Reiter gesperrt mit Grund) und Server (Route, Actions)
  prüfen dasselbe.

  Entscheidung 2026-09-13: Ein Plattform-Schlüssel für die INHALTS-Generierung
  (Handbuch auswerten, Guide erzeugen, Wartungspunkte aus dem Guide) ist
  kostenunsicher — ein Durchlauf kostet Euro, nicht Cent, und die Menge ist
  nicht planbar. Diese Wege bleiben dem Betreiber (Super-Admin) vorbehalten;
  für alle anderen ist der Prompt-Weg der Weg: Prompt kopieren, im eigenen Abo
  ausführen, JSON einfügen (lib/ki-hinweise.ts erklärt ihn).

  Ausnahme ist der Reparaturvorschlag: ein kleiner, planbarer Aufruf, den alle
  über den Plattform-Schlüssel nutzen dürfen. Einen EIGENEN Schlüssel darf nur
  der Super-Admin mitgeben (self-hosted ohne zentralen Key).
*/
export type KiZweck = "reparatur" | "handbuch" | "guide" | "wartung";

export const KI_GRUND_BETREIBER =
  "Die KI-Verarbeitung in der App ist dem Betreiber vorbehalten — die Kosten je Durchlauf sind nicht planbar. Nutze den Prompt-Weg mit deinem eigenen Abo. Das kann sich künftig ändern; dazu müssen aber erst Entscheidungen zu Sponsoring oder zur Annahme von Spenden getroffen werden.";

/**
 * @param kiInDerApp Die Einstellung des Super-Admins (user_settings.ki_in_der_app,
 *   fehlende Zeile = true): false heißt, er will die Oberfläche GENAU so sehen
 *   wie ein normaler Nutzer — dieselben Sperren, derselbe Wortlaut, kein
 *   Sonderhinweis. Der einzige Unterschied bleibt der Schalter auf der
 *   Konto-Seite, sonst käme er nicht mehr zurück.
 */
export function darfKi(
  user: RechteNutzer | null,
  zweck: KiZweck,
  kiInDerApp = true,
): { erlaubt: true } | { erlaubt: false; grund: string } {
  if (zweck === "reparatur") return { erlaubt: true };
  if (isSuperAdmin(user) && kiInDerApp) return { erlaubt: true };
  return { erlaubt: false, grund: KI_GRUND_BETREIBER };
}

/** Darf dieser Nutzer einen eigenen Anthropic-Schlüssel mitgeben? Nur der
    Super-Admin — und auch der nicht, wenn er die KI in der App abgeschaltet hat. */
export function darfEigenenSchluessel(user: RechteNutzer | null, kiInDerApp = true): boolean {
  return isSuperAdmin(user) && kiInDerApp;
}
