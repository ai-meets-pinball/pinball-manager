/*
  Reiner Nachrichtenbau (keine Importe, keine I/O) — deshalb unit-testbar.
  Baut den Inhalt EINER Fehler-Benachrichtigung: den gerenderten Text (Log +
  Body-Fallback) und die Positionsvariablen des genehmigten Templates. Die
  Empfänger-Nummer und die faultId setzt der Aufrufer (whatsapp-benachrichtigung.ts).

  Template-Reihenfolge (muss zum in Twilio genehmigten Template passen):
    {{1}} Maschine · {{2}} Club · {{3}} Fehlerbeschreibung (gekürzt) · {{4}} URL
*/

import type { WhatsappInhalt } from "./types";

const MAX_BESCHREIBUNG = 140;

export function baueNeuerFehlerNachricht(args: {
  maschine: string;
  club: string;
  beschreibung: string;
  url: string;
}): WhatsappInhalt {
  const kurz = args.beschreibung.trim().replace(/\s+/g, " ").slice(0, MAX_BESCHREIBUNG);
  const beschreibung = kurz || "(ohne Beschreibung)";
  return {
    anlass: "neuer Fehler",
    templateVars: [args.maschine, args.club, beschreibung, args.url],
    text: `🔧 Pinball Manager: Neuer Fehler an ${args.maschine} (${args.club}): „${beschreibung}" – ${args.url}`,
  };
}
