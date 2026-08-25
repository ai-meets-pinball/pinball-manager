/*
  WhatsApp-Anbieter-Umschaltung (Lehrbeispiel: bewusst sichtbar, wie der KI-Seam).

  Standard ist "none" — dann wird NICHTS versendet, jeder Versuch nur ins
  whatsapp_log geschrieben. So ist das Feature „dunkel" deploybar: der Code läuft,
  ohne dass ein Twilio-Konto oder ein von WhatsApp genehmigtes Template existiert.
  Erst WHATSAPP_PROVIDER=twilio (mit gesetzten TWILIO_*-Variablen) sendet echt.

  Diese Datei importiert bewusst KEIN SDK / keine Node-Interna, damit sie auch aus
  einer Server-Component billig importierbar ist (z. B. um „konfiguriert?" zu zeigen).
*/

export type WhatsappProvider = "twilio" | "none";

/** Aktiver Anbieter. Default "none" (kein Versand), außer WHATSAPP_PROVIDER=twilio. */
export function getWhatsappProvider(): WhatsappProvider {
  return process.env.WHATSAPP_PROVIDER === "twilio" ? "twilio" : "none";
}

/** Sind die Twilio-Zugangsdaten vollständig gesetzt? (Absender + Konto + Token) */
export function whatsappKonfiguriert(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM,
  );
}

/** Geht echt etwas raus? Nur wenn Anbieter twilio UND vollständig konfiguriert. */
export function whatsappVersandAktiv(): boolean {
  return getWhatsappProvider() === "twilio" && whatsappKonfiguriert();
}
