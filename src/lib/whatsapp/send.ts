import { getWhatsappProvider, type WhatsappProvider } from "./provider";
import { noneAdapter } from "./none";
import { twilioAdapter } from "./twilio";
import {
  WhatsappError,
  type WhatsappAdapter,
  type WhatsappErgebnis,
  type WhatsappNachricht,
} from "./types";

/*
  Zentraler Versand: EIN Weg spricht den Anbieter an UND schreibt eine
  whatsapp_log-Zeile — genau wie sendeMail in lib/email.ts. Das Protokoll ist
  „best effort" (ein Log-Fehler darf den Versand nie brechen); nach dem Loggen
  wird ein Anbieterfehler geworfen, damit der Aufrufer ihn (best-effort) abfangen
  kann.

  Adapter UND Protokoll-Schreiber sind injizierbar — so ist diese Datei ohne
  DB/Netz unit-testbar (der Default-Schreiber lädt `db` erst dann per dynamischem
  Import, wenn er wirklich läuft; Tests reichen einen Spy herein).
*/

export type WhatsappLogZeile = {
  empfaenger: string;
  anlass: string;
  inhalt: string;
  faultId: string | null;
  erfolg: boolean;
  fehler: string | null;
};

export function adapterFuer(provider: WhatsappProvider): WhatsappAdapter {
  return provider === "twilio" ? twilioAdapter : noneAdapter;
}

async function schreibeInDb(zeile: WhatsappLogZeile): Promise<void> {
  const { db } = await import("@/db");
  const { whatsappLog } = await import("@/db/schema");
  await db.insert(whatsappLog).values(zeile);
}

export async function sendeWhatsapp(
  nachricht: WhatsappNachricht,
  opts: {
    adapter?: WhatsappAdapter;
    protokoll?: (zeile: WhatsappLogZeile) => Promise<void>;
  } = {},
): Promise<WhatsappErgebnis> {
  const adapter = opts.adapter ?? adapterFuer(getWhatsappProvider());
  const protokoll = opts.protokoll ?? schreibeInDb;

  let ergebnis: WhatsappErgebnis | undefined;
  let hatFehler = false;
  let fehler: unknown;
  try {
    ergebnis = await adapter(nachricht);
  } catch (e) {
    // Boolean-Flag statt Truthiness von `fehler`: ein (theoretisch) falsy
    // geworfener Wert dürfte nicht als Erfolg durchgehen.
    hatFehler = true;
    fehler = e;
  }

  try {
    await protokoll({
      empfaenger: nachricht.an,
      anlass: nachricht.anlass,
      inhalt: nachricht.text,
      faultId: nachricht.faultId ?? null,
      erfolg: !hatFehler,
      fehler: hatFehler ? fehlerText(fehler) : null,
    });
  } catch (e) {
    console.error("[whatsapp-log] konnte nicht schreiben:", e);
  }

  if (hatFehler) {
    throw fehler instanceof WhatsappError
      ? fehler
      : new WhatsappError("sonstiges", "WhatsApp-Versand fehlgeschlagen.", fehler);
  }
  return ergebnis ?? {};
}

function fehlerText(e: unknown): string {
  if (e instanceof WhatsappError) return `${e.art}: ${e.userMessage}`;
  return e instanceof Error ? e.message : String(e);
}
