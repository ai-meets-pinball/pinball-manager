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

export const DEFAULT_TEMPLATES: Record<TemplateKey, TemplateDefinition> = {
  invite_platform: {
    label: "Einladung zur Plattform",
    beschreibung:
      "Geht raus, wenn ein Super-Admin jemanden zum Pinball Manager einlädt (ohne Club).",
    platzhalter: ["{{einlader}}"],
    subject: "Einladung zum Pinball Manager",
    body: "{{einlader}} lädt dich ein, ein Konto beim Pinball Manager anzulegen.",
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
    .map((absatz) => `<p>${absatz.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

export type ResolvedTemplate = {
  subject: string;
  body: string;
  /** true = angepasst (DB-Eintrag), false = Standard aus dem Code. */
  angepasst: boolean;
};
