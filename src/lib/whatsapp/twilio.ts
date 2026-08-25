import { WhatsappError, type WhatsappAdapter, type WhatsappFehlerArt } from "./types";

/*
  Einzige Stelle, an der Twilio berührt wird (wie anthropic.ts der einzige Ort
  fürs KI-SDK ist). Bewusst OHNE SDK — schlichtes fetch gegen die REST-API mit
  Basic-Auth, wie opdb.ts. SERVER-ONLY (Buffer/fetch/Env).

  Business-initiierte WhatsApp-Nachrichten (unser Fall: proaktiver Alarm außerhalb
  eines laufenden Chats) sind nur mit einem von WhatsApp GENEHMIGTEN Template
  erlaubt — über die Content-API (ContentSid + ContentVariables). Deshalb ist
  TWILIO_WHATSAPP_TEMPLATE_SID PFLICHT: ohne würde ein freier Body zwar von Twilio
  mit 201 angenommen, aber außerhalb des 24-h-Sitzungsfensters NICHT zugestellt —
  ein stiller Fehlversand, der im Protokoll fälschlich als Erfolg stünde. Fehlt der
  SID, brechen wir mit einem klaren Konfigurationsfehler ab.
*/

const API_BASIS = "https://api.twilio.com/2010-04-01";

export const twilioAdapter: WhatsappAdapter = async (nachricht) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // z. B. "whatsapp:+14155238886"
  const templateSid = process.env.TWILIO_WHATSAPP_TEMPLATE_SID;

  if (!sid || !token || !from) {
    throw new WhatsappError(
      "kein-key",
      "Twilio ist nicht vollständig konfiguriert (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM).",
    );
  }
  if (!templateSid) {
    throw new WhatsappError(
      "kein-key",
      "TWILIO_WHATSAPP_TEMPLATE_SID fehlt — proaktive WhatsApp-Nachrichten brauchen ein von WhatsApp genehmigtes Template.",
    );
  }

  const body = new URLSearchParams();
  body.set("From", from.startsWith("whatsapp:") ? from : `whatsapp:${from}`);
  body.set("To", `whatsapp:${nachricht.an}`);
  body.set("ContentSid", templateSid);
  const vars: Record<string, string> = {};
  nachricht.templateVars.forEach((wert, i) => {
    vars[String(i + 1)] = wert;
  });
  body.set("ContentVariables", JSON.stringify(vars));

  let res: Response;
  try {
    res = await fetch(`${API_BASIS}/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
  } catch (e) {
    throw new WhatsappError(
      "nicht-erreichbar",
      "Twilio ist nicht erreichbar. Netzwerk/Endpunkt prüfen.",
      e,
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new WhatsappError(fehlerArt(res.status, detail), meldung(res.status, detail), detail);
  }

  const daten = (await res.json().catch(() => ({}))) as { sid?: string };
  return { providerId: daten.sid };
};

/* Twilio-Fehlercodes (im JSON-Body als "code"): 21211/21614 = ungültige „To"-
   Nummer; 63xxx = WhatsApp-Zustell-/Template-Probleme; 21408 = Region nicht
   freigeschaltet; 401/403 = Auth. */
function fehlerArt(status: number, detail: string): WhatsappFehlerArt {
  if (/"code":\s*(21211|21614)/.test(detail)) return "ungueltige-nummer";
  if (/"code":\s*63\d{3}/.test(detail)) return "abgelehnt";
  if (status === 401 || status === 403 || /"code":\s*21408/.test(detail))
    return "abgelehnt";
  if (status >= 500) return "nicht-erreichbar";
  return "sonstiges";
}

function meldung(status: number, detail: string): string {
  if (/"code":\s*(21211|21614)/.test(detail))
    return "Die WhatsApp-Nummer ist ungültig.";
  if (/"code":\s*63\d{3}/.test(detail))
    return "WhatsApp hat die Nachricht nicht zugestellt (Template, Absender oder Empfänger prüfen).";
  if (status === 401 || status === 403 || /"code":\s*21408/.test(detail))
    return "Twilio hat den Versand abgelehnt (Zugangsdaten, Absender oder Region prüfen).";
  if (status >= 500)
    return "Twilio ist derzeit nicht erreichbar. Bitte später erneut versuchen.";
  // Rest-Fehler: die rohe Twilio-Meldung mitgeben, aber Telefonnummern maskieren,
  // damit keine PII ins whatsapp_log / in die Server-Logs gelangt.
  const sicher = maskiereNummern(detail).replace(/\s+/g, " ").slice(0, 200);
  return `WhatsApp-Versand über Twilio fehlgeschlagen (HTTP ${status}). ${sicher}`;
}

/** Längere Ziffernfolgen (Telefonnummern) im Fehlertext unkenntlich machen. */
function maskiereNummern(s: string): string {
  return s.replace(/\+?\d[\d\s().-]{6,}\d/g, "‹Nummer›");
}
