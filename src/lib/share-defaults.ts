import type { ShareScope } from "@/lib/sharing";

/*
  Standard-Voreinstellungen für Freigaben — im Code, nicht in der DB.
  Eine Zeile in user_settings/club_settings bedeutet nur eine ABWEICHUNG davon
  (gleiches Muster wie bei den E-Mail-Vorlagen).

  Frei von Datenbank-Imports, damit die Einstellungs-Formulare (Client) sie
  nutzen können.
*/

export type ShareDefaults = {
  defaultScope: ShareScope;
  defaultAnonym: boolean;
  defaultZeigeKosten: boolean;
  autoShareFacts: boolean;
  autoShareRepairs: boolean;
};

/* Bewusst zurückhaltend: nichts wird automatisch geteilt, und wenn geteilt
   wird, dann anonym und ohne Kosten. Wer mehr preisgeben will, entscheidet
   das aktiv. */
export const SHARE_DEFAULTS: ShareDefaults = {
  defaultScope: "platform",
  defaultAnonym: true,
  defaultZeigeKosten: false,
  autoShareFacts: false,
  autoShareRepairs: false,
};
