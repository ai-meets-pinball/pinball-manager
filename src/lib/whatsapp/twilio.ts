import { WhatsappError, type WhatsappAdapter, type WhatsappFehlerArt } from "./types";

/*
  Einzige Stelle, an der Twilio berührt wird (wie anthropic.ts der einzige Ort
  fürs KI-SDK ist). Bewusst OHNE SDK — schlichtes fetch gegen die REST-API mit
  Basic-Auth, wie opdb.ts. SERVER-ONLY (Buffer/fetch/Env).

  Business-initiierte WhatsApp-Nachrichten (unser Fall: proaktiver Alarm außerhalb
  eines laufenden Chats) sind nur mit einem von WhatsApp GENEHMIGTEN Template
  erlaubt — über die Content-API (ContentSid + ContentVariables). Ist kein
  TWILIO_WHATSAPP_TEMPLATE_SID gesetzt, fällt der Adapter auf einen freien Body
  zurück; der wird von WhatsApp aber nur innerhalb eines 24-h-Sitzungsfensters
  zugestellt (praktisch nur für lokale Tests).
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

  const body = new URLSearchParams();
  body.set("From", from.startsWith("whatsapp:") ? from : `whatsapp:${from}`);
  body.set("To", `whatsapp:${nachricht.an}`);
  if (templateSid) {
    body.set("ContentSid", templateSid);
    const vars: Record<string, string> = {};
    nachricht.templateVars.forEach((wert, i) => {
      vars[String(i + 1)] = wert;
    });
    body.set("ContentVariables", JSON.stringify(vars));
  } else {
    body.set("Body", nachricht.text);
  }

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

/* Twilio-Fehlercodes (im JSON-Body als "code"): 21211/21614 = ungültige/keine
   WhatsApp-Nummer, 63xxx = WhatsApp-Zustellprobleme. 401/403 = Auth/Template. */
function fehlerArt(status: number, detail: string): WhatsappFehlerArt {
  if (/"code":\s*(21211|21614|21408)/.test(detail)) return "ungueltige-nummer";
  if (status === 401 || status === 403) return "abgelehnt";
  if (status >= 500) return "nicht-erreichbar";
  return "sonstiges";
}

function meldung(status: number, detail: string): string {
  if (/"code":\s*(21211|21614|21408)/.test(detail))
    return "Die WhatsApp-Nummer ist ungültig oder für WhatsApp nicht erreichbar.";
  if (status === 401 || status === 403)
    return "Twilio hat den Versand abgelehnt (Zugangsdaten oder Template/Absender prüfen).";
  if (status >= 500)
    return "Twilio ist derzeit nicht erreichbar. Bitte später erneut versuchen.";
  const kurz = detail.replace(/\s+/g, " ").slice(0, 200);
  return `WhatsApp-Versand über Twilio fehlgeschlagen (HTTP ${status}). ${kurz}`;
}
