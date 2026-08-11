/*
  Der Rückgabewert aller Server Actions, die an ein Formular gebunden sind
  (useActionState).

  Vorher gab es fünf Deklarationen in drei unvereinbaren Formen — {error},
  {error, message} und {error, ok} — und zwölf Module importierten den Typ
  ausgerechnet aus db/actions/clubs.ts, das dadurch zum zufälligen Zuhause
  eines allgemeinen Typs geworden war.

  Eine Verweigerung ist immer ein `error`. Kein stilles Gelingen: eine
  abgelehnte Aktion, die wie Erfolg aussieht, ist für den Nutzer unsichtbar
  und in keinem Test prüfbar.
*/
export type FormState = {
  /** Gesetzt = die Aktion ist fehlgeschlagen; der Text geht an den Nutzer. */
  error?: string;
  /** Gesetzt = Erfolg mit Rückmeldung (z. B. „Sichtbarkeit geändert."). */
  message?: string;
  /** Gesetzt = Erfolg ohne Text; das Formular schließt bzw. lädt neu. */
  ok?: boolean;
};
