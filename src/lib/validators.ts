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

export const addMemberSchema = z.object({
  email: z.string().trim().email("Gültige E-Mail erforderlich"),
  rolle: z.enum(["admin", "member"]),
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

/** Eine Faktentabelle: Spaltenüberschriften + Zeilen (jede Zeile = Zellen). */
export const factTableSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.string())),
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
