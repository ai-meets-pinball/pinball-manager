/*
  E-Mail-Vorlagen: Standardtexte im Code, Abweichungen in der DB.

  Diese Datei ist bewusst FREI von Datenbank-Imports — sie wird auch vom
  Client (Vorschau im Vorlagen-Editor) genutzt. Das Laden aus der DB steckt in
  db/queries.ts (getTemplate); zieht man `db` hier herein, landet der
  Postgres-Treiber im Client-Bundle und der Build bricht.

  Editierbar sind bewusst nur Betreff und Einleitungstext. Der Button mit dem
  Einladungslink und der Gültigkeitshinweis werden fest in lib/email.ts
  gerendert — eine bearbeitete Vorlage kann den Link also nicht entfernen.

  Der Body ist REINER TEXT mit {{platzhaltern}}; beim Rendern wird er escaped
  (kein rohes HTML aus der Datenbank in die Mail).
*/

export const TEMPLATE_KEYS = ["invite_platform", "invite_club"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export type TemplateDefinition = {
  label: string;
  beschreibung: string;
  platzhalter: string[];
  subject: string;
  body: string;
};

const ONBOARDING_EINLADUNG = `{{einlader}} lädt dich zum Pinball Manager ein — eine Betriebs- und Wissensdatenbank für Flipper: Welche Maschine hat welchen Fehler, was wurde wann repariert, was ist zur Wartung fällig — und dazu Wissen je Modell (Handbuch-Daten, Troubleshooting-Guide, Tipps), das man teilen kann. Jetzt braucht die App echte Nutzer:innen statt Testdaten — du bist eine:r der ersten.

SO KOMMST DU REIN
Es gibt keine offene Registrierung. Der Knopf unten legt dein Konto an (Name und Passwort, fertig). Die App läuft unter https://pinball-manager.silverballmania.com und ist fürs Handy gemacht: Reparaturen passieren am Gerät.

DIE ERSTEN ZEHN MINUTEN
1. Maschinen → »Neue Maschine«, Modell aus dem Katalog wählen.
2. Auf der Detailseite unter »Betrieb« den ersten Fehler eintragen — oder gleich das QR-Etikett drucken und ans Gerät kleben: Wer es scannt, meldet einen Fehler mit Foto, ganz ohne Konto.
3. Wenn etwas repariert ist: Reparatur erfassen, Fehler abhaken.

Alles Weitere — Wartungsplan (mit einer umfassenden Standardvorlage zum Kopieren und Kürzen), Dokumente, Handbuch-Daten, Clubs — kommt, wenn du es brauchst. Der kurze Weg hinein steht in der Hilfe unter »Einstieg«, mit einem eigenen Pfad je nachdem, wie du Flipper betreibst:
Solo-Sammler:in: https://pinball-manager.silverballmania.com/help/einstieg
Club-Mitglied: https://pinball-manager.silverballmania.com/help/einstieg?ich=mitglied
Club-Owner / -Admin: https://pinball-manager.silverballmania.com/help/einstieg?ich=owner
Das Ganze gibt es dort auch als PDF-Handbuch.

EHRLICH ZUR KI
Vier Stellen nutzen ein Sprachmodell. Der KI-Reparaturvorschlag läuft für alle über den Schlüssel des Betreibers (kleiner Aufruf, mit Limit). Handbuch-Daten und Guides erzeugst du über den Prompt-Weg: Prompt in der App kopieren, im eigenen KI-Abo (Claude, ChatGPT, Gemini …) mit dem Handbuch-PDF ausführen, das JSON zurück in die App einfügen — die Prüfung sagt dir, ob das Ergebnis gut genug ist, und gibt dir eine Nachfrage für den Chat mit. Warum so: Ein Handbuch-Durchlauf kostet Euro, nicht Cent, und die Menge ist nicht planbar. Das kann sich ändern, wenn Sponsoring oder Spenden geklärt sind. Kostenlose KI-Konten reichen dafür meist nicht — es braucht ein starkes Modell.

WAS WIR VON DIR BRAUCHEN
Benutz die App mit deinen echten Geräten — und sag, was hakt. Oben rechts sitzt auf jeder Seite ein Käfer-Knopf »Problem melden / Feedback«; er nimmt Seite, App-Version und Browser automatisch mit. Am wertvollsten sind konkrete Beobachtungen: Was hast du getan, was hast du erwartet, was ist passiert? Besonders beim Prompt-Weg — ein Tester merkte an, dass Stern-SPIKE-Handbücher gar keine Schalter-Matrix haben und die Prüfung trotzdem danach fragte. Diese eine Notiz hat Prompt und Prüfung verbessert.

WAS DU WISSEN SOLLTEST
Das ist eine Friendly-User-Runde: Es wird sich noch einiges ändern, Fehler sind eingeplant, deine Daten bleiben erhalten. Deine Maschinen sind privat, solange du sie keinem Club zuordnest oder Wissen freigibst. Wer hochlädt, ist für die Rechte am Inhalt verantwortlich — die App weist an jeder Upload-Stelle darauf hin.

Danke, dass du mitmachst — und viel Spaß beim Ausprobieren.`;

export const DEFAULT_TEMPLATES: Record<TemplateKey, TemplateDefinition> = {
  invite_platform: {
    label: "Einladung zur Plattform",
    beschreibung:
      "Geht raus, wenn ein Super-Admin jemanden zum Pinball Manager einlädt (ohne Club).",
    platzhalter: ["{{einlader}}"],
    subject: "Pinball Manager — du bist eingeladen",
    // Der Onboarding-Text für Friendly User (2026-09-13) als Standard: Klartext
    // (Absätze, Zeilenumbrüche, URLs werden verlinkt — kein Markdown). Der
    // Link-Button „Konto erstellen" und der Gültigkeitshinweis kommen aus dem
    // Code darunter. Unter Administration → Einladungs-Rundmail überarbeitbar.
    body: ONBOARDING_EINLADUNG,
  },
  invite_club: {
    label: "Einladung in einen Club",
    beschreibung:
      "Geht raus, wenn jemand per E-Mail in einen Club eingeladen wird.",
    platzhalter: ["{{einlader}}", "{{clubname}}"],
    subject: "Einladung zum Club „{{clubname}}“ — Pinball Manager",
    body: "{{einlader}} lädt dich ein, dem Club {{clubname}} bei Pinball Manager beizutreten.",
  },
};

/** Ersetzt {{platzhalter}} durch Werte; unbekannte Platzhalter werden entfernt. */
export function renderPlaceholders(
  text: string,
  vars: Record<string, string>,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

/** HTML-Escaping — Vorlagen und persönliche Nachrichten sind reiner Text. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapter Text mit Absätzen/Zeilenumbrüchen als HTML. */
export function textToHtml(text: string): string {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map((absatz) => `<p>${verlinke(absatz).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

/** http(s)-URLs im (bereits escapten) Text anklickbar machen. Satzzeichen am
    Ende bleiben draußen; escapte Entities (&amp; …) laufen mit, weil der
    Link-Text derselbe escapte String ist. Nur http/https — nie javascript:. */
function verlinke(escaped: string): string {
  // Erlaubt: alles außer Whitespace, „<" und „&" — außer „&amp;" (ein
  // escaptes „&" in Query-Strings). „&quot;", „&gt;", „&lt;" beenden die URL.
  return escaped.replace(
    /https?:\/\/(?:[^\s<&]|&amp;)+?(?=[.,;:!?)]*(?:\s|$|<|&(?!amp;)))/g,
    (url) => `<a href="${url}" rel="noopener noreferrer">${url}</a>`,
  );
}

export type ResolvedTemplate = {
  subject: string;
  body: string;
  /** true = angepasst (DB-Eintrag), false = Standard aus dem Code. */
  angepasst: boolean;
};
