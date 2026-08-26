/*
  Der Vertrag des WhatsApp-Anbieter-Seams — bewusst ohne eigene Importe, damit
  die Adapter (twilio, none) und send.ts ihn teilen können, ohne einen Zyklus zu
  bilden. Spiegelt das Muster des KI-Seams (lib/ai/types.ts).
*/

/** Der reine Inhalt einer Nachricht (für alle Empfänger gleich). */
export type WhatsappInhalt = {
  /** Gerenderter Text — fürs Protokoll und als Body-Fallback im 24-h-Fenster. */
  text: string;
  /** Positionsvariablen {{1}},{{2}}… des genehmigten Templates (business-initiiert). */
  templateVars: string[];
  /** Kurzer Anlass fürs Protokoll, z. B. „neuer Fehler". */
  anlass: string;
};

/** Eine konkrete Nachricht an EINE Nummer. */
export type WhatsappNachricht = WhatsappInhalt & {
  /** Empfänger im E.164-Format, z. B. +49151… */
  an: string;
  /** Auslösende Fehlermeldung (fürs Protokoll), falls vorhanden. */
  faultId?: string;
  /** Betroffene Maschine (fürs Protokoll + Cooldown), falls vorhanden. */
  machineId?: string;
  /** Empfänger-Konto (fürs Protokoll + Cooldown), falls vorhanden. */
  recipientUserId?: string;
};

export type WhatsappErgebnis = {
  /** Provider-Message-ID (Twilio Message SID), falls der Anbieter eine liefert. */
  providerId?: string;
};

export type WhatsappFehlerArt =
  | "kein-key"
  | "ungueltige-nummer"
  | "abgelehnt"
  | "nicht-erreichbar"
  | "sonstiges";

/** Fehler mit fertiger, für Nutzer gedachter deutscher Meldung (wie AiError). */
export class WhatsappError extends Error {
  readonly art: WhatsappFehlerArt;
  readonly userMessage: string;

  constructor(art: WhatsappFehlerArt, userMessage: string, ursache?: unknown) {
    super(userMessage);
    this.name = "WhatsappError";
    this.art = art;
    this.userMessage = userMessage;
    if (ursache instanceof Error) this.cause = ursache;
  }
}

/*
  Was ein Adapter braucht (an, text, templateVars) und liefert (Provider-ID).
  Die Log-Felder (anlass, faultId) ignoriert der Adapter — sie sind nur für das
  zentrale send.ts, das protokolliert.
*/
export type WhatsappAdapter = (
  nachricht: WhatsappNachricht,
) => Promise<WhatsappErgebnis>;
