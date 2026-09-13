/*
  Die Worte zum Prompt-Weg — an EINER Stelle, damit Dialoge, Hilfe und Tests
  dasselbe sagen. Prompt-Weg heißt: Prompt hier kopieren, im eigenen KI-Abo
  ausführen, das JSON hier einfügen. Warum es diesen Weg gibt, steht in
  lib/ki-zugang.ts (Kostenunsicherheit eines Plattform-Schlüssels).

  Die Modell-Liste altert — deshalb trägt sie ein Stand-Datum, das mit angezeigt
  wird. Beim Aktualisieren nur diese Datei anfassen.
*/

export const KI_WARUM =
  "Die App stellt für die Inhalts-Generierung keinen eigenen KI-Schlüssel bereit: ein Handbuch-Durchlauf oder ein Guide mit Websuche kostet Euro, nicht Cent, und die Menge ist nicht planbar. Dein eigenes KI-Abo hast du ohnehin — dort kostet derselbe Durchlauf nichts extra. Der Prompt-Weg nutzt genau das. Das kann sich künftig ändern; dazu müssen aber erst Entscheidungen zu Sponsoring oder zur Annahme von Spenden getroffen werden.";

export const KI_MODELLE_STAND = "09/2026";

/** Geeignete Modelle — Stand siehe KI_MODELLE_STAND. Reihenfolge = Empfehlung. */
export const KI_MODELLE: { name: string; hinweis: string }[] = [
  {
    name: "Claude Opus 5 / Sonnet 5 (claude.ai, Pro-Abo)",
    hinweis: "PDF-Upload, sehr langer Kontext, saubere Tabellen; Websuche für den Guide.",
  },
  {
    name: "ChatGPT mit GPT-5 (Plus-Abo)",
    hinweis: "PDF-Upload; für Tabellen das Reasoning-Modell wählen, Browsing für den Guide.",
  },
  {
    name: "Gemini 2.5 Pro oder neuer (Google AI Studio / Gemini Advanced)",
    hinweis: "Sehr großer Kontext, PDF direkt lesbar; Tabellen gelegentlich unvollständig — Prüfen hilft.",
  },
];

export const KI_UNGEEIGNET =
  "Nicht geeignet: die kleinen Stufen (Mini, Flash, Nano, Haiku) und alles ohne Datei-Upload — sie raten bei Tabellen und kürzen lange Antworten.";

export const KI_FREE_HINWEIS =
  "Kostenlose Konten liefern vermutlich kein brauchbares Ergebnis: kleinere Modelle, kein oder limitierter PDF-Upload, kurze Antworten (das JSON bricht mittendrin ab), keine Websuche. Dann hilft nur ein leistungsfähigeres Modell mit höherer Reasoning-Stufe — bei Claude etwa Sonnet 5 statt Haiku mit „high“ statt „normal“; bei OpenAI, Google und anderen gilt das Gleiche. Die Prüfung erkennt einen Abbruch und sagt es dir.";

/** Schritte je Weg — nummeriert in der Anleitung. */
export const KI_SCHRITTE: Record<"handbuch" | "guide", string[]> = {
  handbuch: [
    "Prompt kopieren (Knopf oben).",
    "Chat im eigenen Abo öffnen und ein starkes Modell wählen (Liste unten).",
    "Das Handbuch als PDF anhängen — ohne Anhang gibt es nur Geratenes.",
    "Prompt einfügen und absenden.",
    "NUR das JSON komplett kopieren — bei langer Ausgabe „weiter“ verlangen, bis die schließende Klammer da ist.",
    "Hier einfügen, „Prüfen“ drücken, die Tipps lesen — dann „Importieren“.",
  ],
  guide: [
    "Prompt kopieren (er enthält Hersteller, Modell und Baujahr).",
    "Chat im eigenen Abo öffnen, starkes Modell wählen und die Websuche einschalten (Quellen!).",
    "Prompt einfügen und absenden — das dauert eine Weile.",
    "NUR das JSON komplett kopieren — bei langer Ausgabe „weiter“ verlangen, bis die schließende Klammer da ist.",
    "Hier einfügen, „Prüfen“ drücken, die Tipps lesen — dann „Importieren“.",
  ],
};
