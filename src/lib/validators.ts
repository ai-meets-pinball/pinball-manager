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
