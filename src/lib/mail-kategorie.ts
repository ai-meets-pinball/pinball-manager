/* Anzeigenamen der Mail-Kategorien (mail_log.kategorie) — client-safe (kein
   Server-Import), damit Seiten UND Komponenten dieselben Labels nutzen. */
export const MAIL_KATEGORIE_LABEL: Record<string, string> = {
  reset_password: "Passwort-Reset",
  verify_email: "Adressbestätigung",
  change_email: "E-Mail-Wechsel",
  invite_club: "Club-Einladung",
  invite_platform: "Plattform-Einladung",
  maintenance_reminder: "Wartungs-Erinnerung",
  feedback_neu: "Neue Meldung (an Admins)",
  feedback_status: "Melder-Benachrichtigung",
};

export function mailKategorieLabel(kategorie: string): string {
  return MAIL_KATEGORIE_LABEL[kategorie] ?? kategorie;
}
