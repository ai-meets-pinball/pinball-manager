import type { WhatsappAdapter } from "./types";

/*
  No-op-Adapter (Default, WHATSAPP_PROVIDER≠twilio): sendet NICHTS, schreibt nur
  eine Konsolenzeile mit MASKIERTER Nummer (keine vollständige PII in den
  Server-Logs, wie der Reminder-Cron nur Owner-IDs loggt). Das eigentliche
  Protokoll (whatsapp_log) schreibt send.ts — auch im none-Fall (erfolg=true).
*/

function maskiere(nummer: string): string {
  return nummer.length <= 4 ? "***" : `${nummer.slice(0, 3)}***${nummer.slice(-2)}`;
}

export const noneAdapter: WhatsappAdapter = async (nachricht) => {
  console.info(
    `[whatsapp:none] kein Versand (WHATSAPP_PROVIDER≠twilio) → ${maskiere(nachricht.an)} · ${nachricht.anlass}`,
  );
  return {};
};
