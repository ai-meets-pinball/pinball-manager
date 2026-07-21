import { z } from "zod";

/*
  Eingabevalidierung mit zod — bewusst explizit und an einem Ort,
  damit in den Server Actions sichtbar bleibt, was erwartet wird.
*/

/** Wandelt leere Strings (aus FormData) in undefined. */
const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const optionalInt = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? Number(v) : undefined))
  .pipe(z.number().int().optional());

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.string().uuid().optional());

export const machineSchema = z.object({
  hersteller: z.string().trim().min(1, "Hersteller ist erforderlich"),
  modell: z.string().trim().min(1, "Modell ist erforderlich"),
  baujahr: optionalInt,
  opdbRef: optionalString,
  ipdbRef: optionalString,
  clubId: optionalUuid,
});

export const faultSchema = z.object({
  beschreibung: z.string().trim().min(1, "Beschreibung ist erforderlich"),
  kategorie: optionalString,
  prioritaet: z.enum(["niedrig", "mittel", "hoch"]),
  status: z.enum(["offen", "in Arbeit", "behoben"]),
});

export const repairSchema = z.object({
  faultId: optionalUuid,
  diagnose: optionalString,
  massnahme: optionalString,
  teile: optionalString,
  kosten: optionalString, // numeric → als String an Drizzle
  zeit: optionalInt,
  status: z.enum(["offen", "in Arbeit", "erledigt"]),
});

export const clubSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich"),
});

/* ── Rollen & Einladungen ─────────────────────────────────────────────────── */

/* Rollen-Keys. Die Rollen selbst liegen als Daten im `roles`-Katalog (DB);
   diese Konstanten sind nur die stabilen Schlüssel, gegen die der Code prüft. */
export const CLUB_ROLES = ["owner", "admin", "member"] as const;
export type ClubRole = (typeof CLUB_ROLES)[number];

/** Globale Rolle mit Vollzugriff (scope "global" im Katalog). */
export const SUPERADMIN_ROLE = "superadmin";
/** Globale Nur-Lese-Rolle: Einblick in Club-Daten, keine Mutationen. */
export const SUPPORTER_ROLE = "supporter";

/** Einladung / Rollenzuweisung. Owner-Rolle wird zusätzlich in der Action geprüft
    (nur ein Owner darf zum Owner befördern). */
export const inviteSchema = z.object({
  email: z.string().trim().email("Gültige E-Mail erforderlich"),
  rolle: z.enum(CLUB_ROLES),
});

export const roleChangeSchema = z.object({
  rolle: z.enum(CLUB_ROLES),
});

/* ── Passwort-Policy (eine Quelle der Wahrheit, client + server) ───────────── */

export const PASSWORD_MIN = 8;
/** Menschlich lesbarer Hinweis auf die Anforderungen (für Formulare). */
export const PASSWORD_HINT = `Mindestens ${PASSWORD_MIN} Zeichen, mit Groß- und Kleinbuchstaben sowie einer Zahl.`;

/** Prüft die Passwort-Policy. Liefert eine Fehlermeldung oder null (= ok).
    Bewusst eine simple Funktion, damit sie in Client-Formularen UND im
    Better-Auth-Before-Hook (lib/auth.ts) identisch genutzt werden kann. */
export function validatePassword(pw: unknown): string | null {
  if (typeof pw !== "string" || pw.length < PASSWORD_MIN) {
    return `Passwort muss mindestens ${PASSWORD_MIN} Zeichen lang sein.`;
  }
  if (!/[a-z]/.test(pw)) return "Passwort braucht mindestens einen Kleinbuchstaben.";
  if (!/[A-Z]/.test(pw)) return "Passwort braucht mindestens einen Großbuchstaben.";
  if (!/[0-9]/.test(pw)) return "Passwort braucht mindestens eine Zahl.";
  return null;
}

/** Zod-Variante derselben Policy (für Schemas). */
export const passwordSchema = z.string().superRefine((v, ctx) => {
  const problem = validatePassword(v);
  if (problem) ctx.addIssue({ code: "custom", message: problem });
});

/*
  Phase-2-Fakten aus Handbüchern. Bewusst generische Tabellenform (Spalten +
  Zeilen), robust gegenüber unterschiedlichen Handbuch-Layouts und passend zur
  „Service-Console"-Darstellung. Es werden nur Fakten gespeichert, nie der Text.
*/

/** Die Faktentypen, die extrahiert werden (= machine_data.typ). */
export const FACT_TYPES = [
  "coils",
  "switches",
  "lamps",
  "fuses",
  "parts",
  "rules",
] as const;
export type FactType = (typeof FACT_TYPES)[number];

/** Eine Faktentabelle: Spaltenüberschriften + Zeilen (jede Zeile = Zellen).
    Zellen werden tolerant zu Strings gecoerct, damit eine Zahl/Null in einer
    Zelle nicht die ganze Extraktion scheitern lässt. */
export const factTableSchema = z.object({
  columns: z.array(z.coerce.string()),
  rows: z.array(z.array(z.coerce.string())),
});
export type FactTable = z.infer<typeof factTableSchema>;

/** Extraktionsergebnis: je Typ eine Tabelle (leere Tabellen = nicht vorhanden). */
export const extractSchema = z.object({
  coils: factTableSchema,
  switches: factTableSchema,
  lamps: factTableSchema,
  fuses: factTableSchema,
  parts: factTableSchema,
  rules: factTableSchema,
});

/*
  Phase-3-Troubleshooting-Guide (lib/troubleshooting.ts). Wie bei den Fakten
  bewusst eine strukturierte Form statt Freitext/Markdown: ein Guide besteht aus
  Abschnitten, jeder Abschnitt aus Blöcken. Ein Block ist Fließtext, ein
  Warnhinweis oder eine Symptom-Diagnose-Tabelle. So lässt sich der Guide mit
  eigenen Komponenten (themebar, ohne Markdown-Abhängigkeit) rendern.
*/

/** Ein Baustein eines Guide-Abschnitts (discriminated union über `typ`). Zellen/
    Texte werden tolerant zu Strings gecoerct, damit eine Zahl nicht scheitert. */
export const guideBlockSchema = z.discriminatedUnion("typ", [
  z.object({ typ: z.literal("text"), text: z.coerce.string() }),
  z.object({ typ: z.literal("warnung"), text: z.coerce.string() }),
  z.object({
    typ: z.literal("tabelle"),
    titel: z.coerce.string(),
    spalten: z.array(z.coerce.string()),
    zeilen: z.array(z.array(z.coerce.string())),
  }),
]);
export type GuideBlock = z.infer<typeof guideBlockSchema>;

export const guideSectionSchema = z.object({
  titel: z.coerce.string(),
  bloecke: z.array(guideBlockSchema),
});
export type GuideSection = z.infer<typeof guideSectionSchema>;

/** Vollständiger Guide: identifizierte Plattform + Abschnitte + Quellen. */
export const troubleshootingGuideSchema = z.object({
  plattform: z.coerce.string(),
  abschnitte: z.array(guideSectionSchema),
  quellen: z.array(z.coerce.string()),
});
export type TroubleshootingGuide = z.infer<typeof troubleshootingGuideSchema>;

/* JSON-Schema für Claudes Structured Output — spiegelt die zod-Schemas oben.
   Structured Outputs verlangen additionalProperties:false und dass jede
   Eigenschaft in `required` steht; darum ist `titel` bei Tabellen Pflicht
   (leerer String, wenn ohne Titel). */
const guideBlockJsonSchema = {
  anyOf: [
    {
      type: "object",
      properties: { typ: { const: "text" }, text: { type: "string" } },
      required: ["typ", "text"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: { typ: { const: "warnung" }, text: { type: "string" } },
      required: ["typ", "text"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        typ: { const: "tabelle" },
        titel: { type: "string" },
        spalten: { type: "array", items: { type: "string" } },
        zeilen: {
          type: "array",
          items: { type: "array", items: { type: "string" } },
        },
      },
      required: ["typ", "titel", "spalten", "zeilen"],
      additionalProperties: false,
    },
  ],
} as const;

export const troubleshootingGuideJsonSchema = {
  type: "object",
  properties: {
    plattform: { type: "string" },
    abschnitte: {
      type: "array",
      items: {
        type: "object",
        properties: {
          titel: { type: "string" },
          bloecke: { type: "array", items: guideBlockJsonSchema },
        },
        required: ["titel", "bloecke"],
        additionalProperties: false,
      },
    },
    quellen: { type: "array", items: { type: "string" } },
  },
  required: ["plattform", "abschnitte", "quellen"],
  additionalProperties: false,
} as const;

/* ── Wartungsplan (Phase „interaktiver Wartungsplan") ──────────────────────── */

export const MAINTENANCE_PRIORITAETEN = [
  "niedrig",
  "mittel",
  "hoch",
  "sehr hoch",
  "kritisch",
] as const;
export const MAINTENANCE_INTERVALL_TYPEN = ["zeit", "spiele", "bedarf"] as const;

/** Ein Wartungspunkt (Anlegen/Bearbeiten). `intervallTage` ist nur bei
    `intervallTyp = "zeit"` sinnvoll (die Action berechnet daraus die Fälligkeit). */
export const maintenanceTaskSchema = z.object({
  titel: z.string().trim().min(1, "Titel ist erforderlich"),
  kategorie: optionalString,
  bauteil: optionalString,
  taetigkeit: optionalString,
  beschreibung: optionalString,
  prioritaet: z.enum(MAINTENANCE_PRIORITAETEN),
  intervallTyp: z.enum(MAINTENANCE_INTERVALL_TYPEN),
  intervallTage: optionalInt,
  intervallText: optionalString,
});

/** Eine Erledigung (Historien-Eintrag). `datum` als yyyy-mm-dd aus dem
    Date-Input; die Action wandelt es in ein Date (leer = heute). */
export const maintenanceLogSchema = z.object({
  datum: optionalString,
  notiz: optionalString,
});

/* JSON-Schema für den KI-Import aus dem Troubleshooting-Guide (Structured
   Output erzwingt gültige Enum-Werte; `intervallTage` 0 = kein Zeitintervall,
   weil nullable-Typen im Schema unnötig Komplexität brächten). */
export const maintenanceImportJsonSchema = {
  type: "object",
  properties: {
    punkte: {
      type: "array",
      items: {
        type: "object",
        properties: {
          titel: { type: "string" },
          kategorie: { type: "string" },
          bauteil: { type: "string" },
          taetigkeit: { type: "string" },
          intervallTyp: { enum: [...MAINTENANCE_INTERVALL_TYPEN] },
          intervallTage: { type: "integer" },
          prioritaet: { enum: [...MAINTENANCE_PRIORITAETEN] },
          beschreibung: { type: "string" },
        },
        required: [
          "titel",
          "kategorie",
          "bauteil",
          "taetigkeit",
          "intervallTyp",
          "intervallTage",
          "prioritaet",
          "beschreibung",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["punkte"],
  additionalProperties: false,
} as const;

/** zod-Gegenstück zum Import-Schema (tolerant zu Strings gecoerct). */
export const maintenanceImportSchema = z.object({
  punkte: z.array(
    z.object({
      titel: z.coerce.string(),
      kategorie: z.coerce.string(),
      bauteil: z.coerce.string(),
      taetigkeit: z.coerce.string(),
      intervallTyp: z.enum(MAINTENANCE_INTERVALL_TYPEN),
      intervallTage: z.coerce.number().int(),
      prioritaet: z.enum(MAINTENANCE_PRIORITAETEN),
      beschreibung: z.coerce.string(),
    }),
  ),
});
