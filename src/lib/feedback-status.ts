import { FEEDBACK_ABSCHLUSS_STATUS } from "@/lib/validators";

/*
  Reine Regeln rund um den Feedback-Status (ohne DB/Mail) — damit die
  Entscheidung „wann wird der Melder benachrichtigt?" testbar an EINER Stelle
  liegt und Web-Triage wie CLI sie teilen (feedback-core ruft sie auf).
*/

/** Ist der Status ein Abschluss (erledigt/zurückgestellt/verworfen)? */
export function istAbschluss(status: string): boolean {
  return (FEEDBACK_ABSCHLUSS_STATUS as readonly string[]).includes(status);
}

/**
 * Den Melder benachrichtigen, wenn die Meldung in einen Abschluss-Status
 * übergeht ODER dort die Antwort geändert wird — NIE bei offen/in Arbeit und
 * nie beim reinen Nachspeichern desselben Stands (verhindert Doppel-Mails).
 */
export function sollBenachrichtigen(
  vorher: string,
  nachher: string,
  antwortGeaendert: boolean,
): boolean {
  if (!istAbschluss(nachher)) return false;
  return vorher !== nachher || antwortGeaendert;
}

/** Satz für die Melder-Mail je Abschluss-Status. */
export const FEEDBACK_ABSCHLUSS_SATZ: Record<string, string> = {
  erledigt: "wurde als erledigt markiert",
  zurückgestellt: "wurde vorerst zurückgestellt",
  verworfen: "wurde nach Prüfung nicht übernommen",
};
