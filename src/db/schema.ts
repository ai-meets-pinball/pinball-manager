import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

/* Re-Export, damit der Better-Auth-Adapter und drizzle-kit alle Tabellen über schema.ts sehen. */
export * from "./auth-schema";

/* ── Enums (deutsche Domänenwerte, sichtbar im Schema) ────────────────────── */

export const faultStatus = pgEnum("fault_status", [
  "offen",
  "quittiert",
  "in Arbeit",
  "behoben",
]);

export const repairStatus = pgEnum("repair_status", [
  "offen",
  "in Arbeit",
  "erledigt",
]);

export const faultPrioritaet = pgEnum("fault_prioritaet", [
  "niedrig",
  "mittel",
  "hoch",
  "kritisch",
]);

/* Betriebsstatus einer Maschine. Die Werte sind hier als DB-Enum verankert; die
   REGEL dahinter (abgeleitet vs. manuell gepinnt) liegt in lib/betriebsstatus.ts,
   und lib/validators.ts leitet sein Schema von dort ab. Wer hier Werte ändert,
   ändert sie auch dort — und braucht eine Migration. */
export const machineStatus = pgEnum("machine_status", [
  "spielbereit",
  "eingeschraenkt",
  "ausser_betrieb",
]);

/* Wartungs-Priorität — eigene Skala (Timms Wartungsliste kennt zusätzlich
   „sehr hoch" und „kritisch", darum nicht faultPrioritaet wiederverwendet). */
export const maintenancePrioritaet = pgEnum("maintenance_prioritaet", [
  "niedrig",
  "mittel",
  "hoch",
  "sehr hoch",
  "kritisch",
]);

/* Wie das Wartungsintervall zu verstehen ist. Nur „zeit" ergibt einen
   berechenbaren Termin; „spiele"/„bedarf" sind reine Checklisten-Punkte. */
export const maintenanceIntervallTyp = pgEnum("maintenance_intervall_typ", [
  "zeit",
  "spiele",
  "bedarf",
]);

/* Wissensbasis (Datenmodell-Redesign): Sichtbarkeit ist eine eigene Achse,
   getrennt vom Geltungsbereich (Generation/Modell/Flipper). Autor ist immer
   sichtbar — daher keine Anonymität. `source_type` erlaubt es, extrahierte
   Inhalte bei einer Copyright-Anfrage gezielt herauszufiltern. */
export const knowledgeVisibility = pgEnum("knowledge_visibility", [
  "privat",
  "club",
  "oeffentlich",
]);

export const knowledgeSource = pgEnum("knowledge_source", [
  "extrahiert",
  "eigen",
  "community",
]);

/* Feedback-/Bug-Report-System: Meldungen der Nutzer über die APP selbst
   (nicht über Maschinen — das sind `faults`). */
export const feedbackTyp = pgEnum("feedback_typ", ["fehler", "verbesserung"]);

export const feedbackStatus = pgEnum("feedback_status", [
  "offen",
  "in Arbeit",
  "erledigt",
  "zurückgestellt",
  "verworfen",
]);

/* ── Clubs ────────────────────────────────────────────────────────────────── */

export const clubs = pgTable("clubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // Vereins-Logo (JPG/PNG/SVG, Supabase Storage club-logos/) — optional.
  logoUrl: text("logo_url"),
  // Turniermodus (geteilt): AN → das Dashboard schlägt Alarm, solange ein
  // OFFENER (unquittierter) Fehler an einer Club-Maschine steht. Owner/Admin
  // schalten ihn; alle Mitglieder sehen den Alarm.
  turniermodus: boolean("turniermodus").notNull().default(false),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── Rollen (Katalog) & Zuweisungen ───────────────────────────────────────── */
/*
  EIN einheitliches Rollenmodell für globale UND Club-Rollen:

  - `roles` ist der Katalog (Daten statt Enum): superadmin (scope "global"),
    owner/admin/member (scope "club"). `rang` erlaubt Vergleiche (owner > admin).
  - `role_assignments` weist einem Nutzer eine Rolle zu — mit `clubId` für
    Club-Rollen, `clubId = NULL` für globale Rollen.
  - Eine club-bezogene Zuweisung IST die Mitgliedschaft (es gibt keine separate
    memberships-Tabelle mehr) — eine Quelle der Wahrheit, kein Auseinanderdriften.
*/

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(), // superadmin | owner | admin | member
  label: text("label").notNull(), // Anzeigename (deutsch)
  beschreibung: text("beschreibung"),
  scope: text("scope").notNull(), // "global" | "club"
  rang: integer("rang").notNull().default(0),
});

export const roleAssignments = pgTable(
  "role_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    // NULL = globale Rolle; gesetzt = Rolle in genau diesem Club (= Mitgliedschaft).
    clubId: uuid("club_id").references(() => clubs.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    // Pro Club genau eine Rolle je Nutzer.
    uniqueIndex("role_assignments_club_unique")
      .on(t.userId, t.clubId)
      .where(sql`club_id IS NOT NULL`),
    // Global jede Rolle höchstens einmal je Nutzer (mehrere globale Rollen erlaubt).
    uniqueIndex("role_assignments_global_unique")
      .on(t.userId, t.roleId)
      .where(sql`club_id IS NULL`),
  ],
);

/* ── Einladungen ──────────────────────────────────────────────────────────── */
/* Ein Owner/Admin lädt eine E-Mail ein (bestehend oder neu). Der Token landet im
   Einladungslink; nach Annahme (oder Sign-up über den Link) entsteht eine
   Mitgliedschaft. Nur ein offener Invite je (clubId, email) — app-seitig geprüft. */

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  // NULL = Plattform-Einladung (nur „du darfst dich registrieren", ohne Club).
  // Gesetzt = Club-Einladung; dann trägt roleId die Rolle, die die Annahme vergibt.
  clubId: uuid("club_id").references(() => clubs.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  // Welche Club-Rolle die Annahme vergibt (Katalog-FK statt Enum); NULL bei
  // Plattform-Einladungen.
  roleId: uuid("role_id").references(() => roles.id),
  token: text("token").notNull().unique(),
  invitedBy: text("invited_by")
    .notNull()
    .references(() => user.id),
  status: text("status").notNull().default("pending"), // pending | accepted | revoked
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── E-Mail-Vorlagen ──────────────────────────────────────────────────────── */
/*
  Editierbare Texte für verschickte E-Mails. Nur Betreff und Einleitungstext
  sind anpassbar — der Button mit dem Einladungslink und der Gültigkeitshinweis
  werden fest im Code gerendert, damit eine bearbeitete Vorlage den Link nicht
  versehentlich entfernen kann.

  Es gibt NUR Zeilen für abweichende Vorlagen: fehlt der Eintrag, gilt der
  Standard aus lib/email-templates.ts. „Zurücksetzen" = Zeile löschen.
*/
export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(), // invite_platform | invite_club
  subject: text("subject").notNull(),
  body: text("body").notNull(), // reiner Text mit {{platzhaltern}}
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by").references(() => user.id),
});

/* ── Modell-Katalog ────────────────────────────────────────────────────── */
/*
  Ein Eintrag je OPDB-MASCHINE (Edition), nicht je Gruppe/Titel — „Godzilla
  Premium" und „Godzilla Pro" sind getrennte Typen, weil sich Spulen- und
  Schaltermatrizen unterscheiden. `opdbGroupRef` hält den Titel fest, damit
  Editionen später gebündelt werden können.

  Der Katalog ist GETEILT: er gehört niemandem. Deshalb wird beim Anlegen nur
  eingefügt, wenn der Eintrag fehlt (first writer wins) — sonst könnte ein
  Nutzer, der seine Instanzfelder überschreibt, die Daten aller anderen ändern.
  Die Felder an `machines` bleiben Instanz-Overrides für die Anzeige.
*/
export const machineModels = pgTable("machine_models", {
  id: uuid("id").primaryKey().defaultRandom(),
  opdbRef: text("opdb_ref").notNull().unique(), // z. B. "G50Wr-MLeZP"
  opdbGroupRef: text("opdb_group_ref"), // z. B. "G50Wr"
  hersteller: text("hersteller").notNull(),
  modell: text("modell").notNull(),
  baujahr: integer("baujahr"),
  ipdbRef: text("ipdb_ref"),
  imageUrl: text("image_url"),
  // Generation (Board-/Hardware-System). Befüllt aus dem Katalog-Import
  // (opdb-Match) oder per Hand im Admin. onDelete: set null — eine gelöschte
  // Generation lässt die Modelle bestehen, nur die Zuordnung entfällt.
  generationId: uuid("generation_id").references(() => generations.id, {
    onDelete: "set null",
  }),
  // true = im Admin von Hand zugeordnet → ein erneuter Katalog-Import überschreibt
  // das NICHT (schützt Overrides). false = aus dem Import (darf überschrieben werden).
  generationManuell: boolean("generation_manuell").notNull().default(false),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
});

/* ── Geräte-Besitzer (Katalog) ───────────────────────────────────────────── */
/*
  Der TATSÄCHLICHE Besitzer eines Geräts — getrennt von machines.ownerId (das
  ist der anlegende Nutzer und trägt die Autorisierung; der Besitzer hier ist
  REIN INFORMATIV und vergibt keine Rechte). Oft ist der Besitzer kein
  Plattform-Nutzer, sondern nur ein Name — die Namen bilden einen Katalog:
  einmal gewählt, wieder auswählbar. Geltungsbereich: Club-Eintrag (für alle
  Mitglieder wählbar) oder privater Eintrag des Erstellers (clubId = NULL).
  `email` ist die Basis für eine spätere Club-Einladung; `userId` wird gesetzt,
  sobald der Besitzer ein Konto hat (beim Annehmen der Einladung verknüpft).
*/
export const machineBesitzer = pgTable(
  "machine_besitzer",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email"),
    // NULL = privater Eintrag des Erstellers; gesetzt = Club-Katalog.
    clubId: uuid("club_id").references(() => clubs.id, {
      onDelete: "cascade",
    }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    // Verknüpftes Plattform-Konto (sobald bekannt) — rein informativ.
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    // Ein Name je Geltungsbereich (case-insensitiv) — das macht den Katalog
    // wiederverwendbar statt beliebig.
    uniqueIndex("machine_besitzer_club_name_unique")
      .on(t.clubId, sql`lower(${t.name})`)
      .where(sql`club_id IS NOT NULL`),
    uniqueIndex("machine_besitzer_privat_name_unique")
      .on(t.createdBy, sql`lower(${t.name})`)
      .where(sql`club_id IS NULL`),
  ],
);

/*
  Zuordnung Maschine ↔ Besitzer (n:m): ein Gerät kann MEHRERE Besitzer haben
  (z. B. gemeinsam angeschafft), derselbe Besitzer mehrere Geräte. Löschen auf
  beiden Seiten räumt die Zuordnung mit ab.
*/
export const machineBesitzerZuordnung = pgTable(
  "machine_besitzer_zuordnung",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    machineId: uuid("machine_id")
      .notNull()
      .references(() => machines.id, { onDelete: "cascade" }),
    besitzerId: uuid("besitzer_id")
      .notNull()
      .references(() => machineBesitzer.id, { onDelete: "cascade" }),
  },
  (t) => [
    unique("machine_besitzer_zuordnung_unique").on(t.machineId, t.besitzerId),
  ],
);

/*
  Ausstattung/Add-ons EINER Maschine (1:n): frei benannte Einträge, was an genau
  diesem Gerät zusätzlich verbaut oder dabei ist (Shaker, Topper, farbige LEDs,
  Ersatz-Gummisatz …). Bewusst schlicht — Name + optionale Notiz, KEINE
  Kategorie, kein Katalog wie bei den Besitzern. Löschen der Maschine räumt die
  Einträge mit ab.
*/
export const machineAusstattung = pgTable("machine_ausstattung", {
  id: uuid("id").primaryKey().defaultRandom(),
  machineId: uuid("machine_id")
    .notNull()
    .references(() => machines.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  notiz: text("notiz"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── Maschinen ────────────────────────────────────────────────────────────── */

export const machines = pgTable("machines", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Ersteller/Eigentümer — Basis der App-Layer-Autorisierung (kein RLS!).
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id),
  // Optional: Maschine einem Club zugeordnet (geteilt mit den Mitgliedern).
  clubId: uuid("club_id").references(() => clubs.id),
  // Verweis auf das geteilte Modell. Nullable: Handeingaben ohne OPDB
  // bleiben erlaubt (können später zugeordnet werden).
  modelId: uuid("model_id").references(() => machineModels.id),
  hersteller: text("hersteller").notNull(),
  modell: text("modell").notNull(),
  baujahr: integer("baujahr"),
  opdbRef: text("opdb_ref"),
  ipdbRef: text("ipdb_ref"),
  fotoUrl: text("foto_url"),
  // QR-Melde-Code: wer den QR-Code der Maschine scannt (physischer Zugang),
  // darf über /m/<code> einen Fehler melden — auch ohne Konto. Bewusst ein
  // EIGENES Geheimnis statt der Maschinen-id: die id kursiert in App-URLs,
  // der Code nur auf dem Aufkleber (und ist damit später austauschbar).
  // KURZ (12 Hex-Zeichen ≈ 48 Bit) statt uuid, damit der QR grob und auch
  // klein gedruckt gut scannbar bleibt.
  qrToken: text("qr_token")
    .notNull()
    .unique()
    .default(sql`substr(md5(gen_random_uuid()::text), 1, 12)`),
  // Verknüpfter Standard-Wartungsplan (maintenance_plans): gesetzt = die
  // Maschine FOLGT dem Standard (Änderungen propagieren); null = eigener Plan
  // (Kopie oder eigenständig). Standard gelöscht → Maschine wird eigenständig.
  maintenancePlanId: uuid("maintenance_plan_id").references(
    () => maintenancePlans.id,
    { onDelete: "set null" },
  ),
  // Betriebsstatus (Dashboard). `statusManuell=false` → aus den offenen Fehlern
  // abgeleitet; `true` → per Hand gepinnt (mit Begründung). `statusSeit` speist
  // den „Seit HH:MM:SS"-Ticker und wird nur bei echter Statusänderung gebumpt.
  status: machineStatus("status").notNull().default("spielbereit"),
  statusSeit: timestamp("status_seit").notNull().defaultNow(),
  statusManuell: boolean("status_manuell").notNull().default(false),
  statusGrund: text("status_grund"),
  statusVon: text("status_von").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── Fehler ───────────────────────────────────────────────────────────────── */
/* Das Symptom (`beschreibung`) lebt NUR hier — niemals dupliziert an der Reparatur. */

export const faults = pgTable("faults", {
  id: uuid("id").primaryKey().defaultRandom(),
  machineId: uuid("machine_id")
    .notNull()
    .references(() => machines.id, { onDelete: "cascade" }),
  datum: timestamp("datum").notNull().defaultNow(),
  beschreibung: text("beschreibung").notNull(),
  kategorie: text("kategorie"), // z. B. Spule, Schalter, Anzeige, mechanisch
  prioritaet: faultPrioritaet("prioritaet").notNull().default("mittel"),
  status: faultStatus("status").notNull().default("offen"),
  gemeldetVon: text("gemeldet_von").references(() => user.id),
  // Gast-Meldung über den QR-Code: nur ein angegebener Name, kein Konto
  // (dann ist gemeldetVon NULL). Anzeige als „<Name> (Gast)".
  gemeldetVonName: text("gemeldet_von_name"),
});

/*
  Fotos zu einer Fehlermeldung (n:1) — beim Melden angehängt (angemeldet ODER
  Gast über den QR-Code). Liegen im öffentlichen Storage-Bucket (Ordner
  fault-images/), hier nur die URL. Löscht die Maschine/den Fehler, fallen die
  Zeilen per Cascade mit weg (die Storage-Objekte bleiben — wie bei den übrigen
  Uploads bewusst nicht mitgelöscht).
*/
export const faultImages = pgTable("fault_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  faultId: uuid("fault_id")
    .notNull()
    .references(() => faults.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── Reparaturen ──────────────────────────────────────────────────────────── */
/* Optionale Verknüpfung zu einem Fehler. Behebt die Reparatur den Fehler,
   wird dessen Status in der Server Action auf "behoben" gesetzt (nicht per Trigger). */

export const repairs = pgTable("repairs", {
  id: uuid("id").primaryKey().defaultRandom(),
  machineId: uuid("machine_id")
    .notNull()
    .references(() => machines.id, { onDelete: "cascade" }),
  faultId: uuid("fault_id").references(() => faults.id),
  datum: timestamp("datum").notNull().defaultNow(),
  diagnose: text("diagnose"),
  massnahme: text("massnahme"),
  teile: text("teile"),
  kosten: numeric("kosten", { precision: 10, scale: 2 }),
  zeit: integer("zeit"), // Aufwand in Minuten
  status: repairStatus("status").notNull().default("offen"),
});

/* ── Reparatur ↔ Fehler (n:m) ─────────────────────────────────────────────── */
/*
  Eine Reparatur kann MEHRERE Fehler beheben (PRD §4.2–4.3). Dies ist die
  Wahrheit der Verknüpfung; `repairs.fault_id` bleibt als „primärer" Fehler
  bestehen (für die geteilte Reparatur-Ansicht, die genau ein Symptom zeigt).
  Erledigt eine Reparatur, werden ALLE verknüpften Fehler in der Server Action
  auf „behoben" gesetzt.
*/
export const repairFaults = pgTable(
  "repair_faults",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repairId: uuid("repair_id")
      .notNull()
      .references(() => repairs.id, { onDelete: "cascade" }),
    faultId: uuid("fault_id")
      .notNull()
      .references(() => faults.id, { onDelete: "cascade" }),
  },
  (t) => [unique("repair_faults_unique").on(t.repairId, t.faultId)],
);

/* ── Freigaben (geteiltes Wissen) ─────────────────────────────────────────── */
/*
  Was wird wie weit geteilt. Bewusst EINE Tabelle für alle Artefakttypen und
  Reichweite × Flag statt eines Enums mit vier Kombinationen:
    scope "platform" = alle angemeldeten Nutzer   (+ anonym → „public anonym")
    scope "club"     = Mitglieder der Ziel-Clubs
    scope "users"    = ausdrücklich benannte Nutzer (unabhängig vom Club)

  Bei Handbuch-Fakten ist artefaktId die MASCHINEN-id, nicht die machine_data-Zeile:
  ein erneuter Upload löscht und ersetzt alle Faktenzeilen der Maschine
  (manual-extract.ts), eine Freigabe auf Zeilen-IDs wäre danach tot.
*/
export const shares = pgTable(
  "shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    artefaktTyp: text("artefakt_typ").notNull(), // machine_facts | repair
    artefaktId: uuid("artefakt_id").notNull(),
    // Modell, auf das sich das Wissen bezieht — der Anker zum Wiederfinden.
    modelId: uuid("model_id")
      .notNull()
      .references(() => machineModels.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(), // platform | club | users
    anonym: boolean("anonym").notNull().default(true),
    zeigeKosten: boolean("zeige_kosten").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  // Ein Artefakt hat höchstens eine Freigabe — Reichweite ändern = Zeile ändern.
  (t) => [unique("shares_artefakt_unique").on(t.artefaktTyp, t.artefaktId)],
);

/* Ziele für scope "club"/"users" — nullbare FKs wie bei role_assignments.
   Bei scope "platform" gibt es keine Zeilen. */
export const shareTargets = pgTable("share_targets", {
  id: uuid("id").primaryKey().defaultRandom(),
  shareId: uuid("share_id")
    .notNull()
    .references(() => shares.id, { onDelete: "cascade" }),
  clubId: uuid("club_id").references(() => clubs.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
});

/* ── Freigabe-Voreinstellungen ────────────────────────────────────────────── */
/*
  Wie beim email_templates-Muster: eine Zeile bedeutet ABWEICHUNG vom Standard.
  Fehlt sie, gelten die Werte aus dem Code (lib/share-defaults.ts) —
  „Zurücksetzen" ist damit ein Löschen, und es braucht keine Seed-Migration.

  Welche Voreinstellung greift: gehört die Maschine einem Club, entscheidet der
  Club; sonst der Eigentümer. Im Einzelfall ist alles übersteuerbar.
*/
const shareDefaultSpalten = {
  defaultScope: text("default_scope").notNull().default("platform"),
  defaultAnonym: boolean("default_anonym").notNull().default(true),
  defaultZeigeKosten: boolean("default_zeige_kosten").notNull().default(false),
  autoShareFacts: boolean("auto_share_facts").notNull().default(false),
  autoShareRepairs: boolean("auto_share_repairs").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
};

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  ...shareDefaultSpalten,
});

export const clubSettings = pgTable("club_settings", {
  clubId: uuid("club_id")
    .primaryKey()
    .references(() => clubs.id, { onDelete: "cascade" }),
  ...shareDefaultSpalten,
});

/* ── Wissensbasis (Datenmodell-Redesign, Phase 1) ─────────────────────────── */
/*
  `knowledge` vereinheitlicht Wissen über drei Ebenen: Generation → Modell →
  Flipper — GENAU eine davon je Eintrag (Check-Constraint). Phase 1 nutzt nur
  die Modell-/Maschinen-Ebene und typ='handbuch_fakten' und löst damit
  `machine_data` ab: ein Handbuch wird einmal am MODELL gepflegt und erscheint
  an allen Instanzen. Sichtbarkeit (privat|club|oeffentlich) ist eine eigene
  Achse; der Autor (`created_by`) ist immer sichtbar. `generations` wird jetzt
  LEER angelegt (Datenquelle offen, Phase 4), damit FK/Check von Anfang an stehen.
*/
export const generations = pgTable("generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Board-/Hardware-System, z. B. "WPC-95", "Stern SPIKE2™ System". Eindeutig,
  // damit der Katalog-Import idempotent per Name upserten kann.
  name: text("name").notNull().unique(),
  hersteller: text("hersteller"),
  jahrVon: integer("jahr_von"),
  jahrBis: integer("jahr_bis"),
});

export const knowledge = pgTable(
  "knowledge",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    typ: text("typ").notNull(), // Phase 1: 'handbuch_fakten'
    titel: text("titel").notNull(),
    // Phase 1: das extractSchema-Objekt { coils, switches, … } — nur Fakten.
    inhalt: jsonb("inhalt").notNull(),
    quelle: text("quelle"),
    sourceType: knowledgeSource("source_type").notNull(),
    visibility: knowledgeVisibility("visibility").notNull().default("privat"),
    // Geltungsbereich: GENAU eine der drei Ebenen (Check-Constraint unten).
    generationId: uuid("generation_id").references(() => generations.id, {
      onDelete: "cascade",
    }),
    modelId: uuid("model_id").references(() => machineModels.id, {
      onDelete: "cascade",
    }),
    machineId: uuid("machine_id").references(() => machines.id, {
      onDelete: "cascade",
    }),
    // Anker für visibility='club' — welcher Club darf sehen.
    clubId: uuid("club_id").references(() => clubs.id, {
      onDelete: "set null",
    }),
    // Rückverweis für Forks (Phase 5); Phase 1 ungenutzt, daher (noch) ohne FK.
    forkedFromId: uuid("forked_from_id"),
    // Kuratoren-Moderation: für ALLE verborgen (außer Autor, Kuratoren und
    // Super-Admins — die sehen den Eintrag markiert samt Begründung).
    // verborgen_am IS NULL = sichtbar. ON DELETE SET NULL: der Eintrag bleibt
    // verborgen, auch wenn das Kuratoren-Konto gelöscht wird.
    verborgenAm: timestamp("verborgen_am"),
    verborgenVon: text("verborgen_von").references(() => user.id, {
      onDelete: "set null",
    }),
    verborgenGrund: text("verborgen_grund"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    // Tipps (typ='tipp') hängen NICHT direkt an einer Ebene — ihr Geltungsbereich
    // liegt n:m in `knowledge_targets` (ein Tipp kann mehrere Modelle und/oder
    // Generationen betreffen). Alles andere Wissen: GENAU eine Ebene.
    check(
      "knowledge_genau_eine_ebene",
      sql`case when ${t.typ} = 'tipp' then num_nonnulls(${t.generationId}, ${t.modelId}, ${t.machineId}) = 0 else num_nonnulls(${t.generationId}, ${t.modelId}, ${t.machineId}) = 1 end`,
    ),
  ],
);

/*
  Geltungsbereich allgemeiner Tipps (typ='tipp'): je Zeile GENAU ein Ziel —
  ein Modell ODER eine Generation. Ein Tipp mit mehreren Zeilen gilt für alle
  genannten Ziele; Signale/Moderation bleiben am einen `knowledge`-Eintrag.
*/
export const knowledgeTargets = pgTable(
  "knowledge_targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    knowledgeId: uuid("knowledge_id")
      .notNull()
      .references(() => knowledge.id, { onDelete: "cascade" }),
    generationId: uuid("generation_id").references(() => generations.id, {
      onDelete: "cascade",
    }),
    modelId: uuid("model_id").references(() => machineModels.id, {
      onDelete: "cascade",
    }),
  },
  (t) => [
    check(
      "knowledge_targets_genau_ein_ziel",
      sql`num_nonnulls(${t.generationId}, ${t.modelId}) = 1`,
    ),
    // Dasselbe Ziel nicht doppelt an einem Tipp (NULLS NOT DISTINCT, damit
    // z. B. zweimal dasselbe Modell trotz generation_id=NULL kollidiert).
    unique("knowledge_targets_eindeutig")
      .on(t.knowledgeId, t.generationId, t.modelId)
      .nullsNotDistinct(),
  ],
);

/* ── Community-Signale (Datenmodell-Redesign Phase 5) ─────────────────────── */
/*
  Rückmeldung der Community zu einem Wissenseintrag: „hilfreich" oder „falsch".
  Genau EIN Signal je Nutzer und Eintrag (unique) — erneutes Klicken schaltet um
  oder entfernt es. Vorerst rein anzeigend (keine Auto-Moderation); Kuratoren,
  Overrides und Revisionen folgen als eigene Schritte.
*/
export const knowledgeSignals = pgTable(
  "knowledge_signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    knowledgeId: uuid("knowledge_id")
      .notNull()
      .references(() => knowledge.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    wert: text("wert").notNull(), // 'hilfreich' | 'falsch'
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("knowledge_signals_unique").on(t.knowledgeId, t.userId)],
);

/*
  Persönliche Overrides (Datenmodell-Redesign Phase 5): ein Nutzer blendet einen
  Wissenseintrag für SICH aus (typ='ausblenden'). Rein persönlich — ändert nichts
  für andere. Genau EIN Override je Nutzer und Eintrag. (Fork/Kuratoren folgen.)
*/
export const knowledgeOverrides = pgTable(
  "knowledge_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    knowledgeId: uuid("knowledge_id")
      .notNull()
      .references(() => knowledge.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    typ: text("typ").notNull().default("ausblenden"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("knowledge_overrides_unique").on(t.knowledgeId, t.userId)],
);

/*
  Bearbeitungs-Verlauf (Datenmodell-Redesign Phase 5): jede Änderung eines
  Wissenseintrags — In-Place-Edit ODER Neu-Generierung/Import — sichert vorher
  den ALTEN Stand als Revision. Der aktuelle Stand lebt immer in `knowledge`
  selbst; „Verlauf leer" heißt schlicht „nie geändert". Cascade beim Löschen des
  Eintrags — Verlauf ohne Eintrag ist wertlos.
*/
export const knowledgeRevisions = pgTable(
  "knowledge_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    knowledgeId: uuid("knowledge_id")
      .notNull()
      .references(() => knowledge.id, { onDelete: "cascade" }),
    // Stand VOR der Änderung.
    titel: text("titel").notNull(),
    inhalt: jsonb("inhalt").notNull(),
    editedBy: text("edited_by")
      .notNull()
      .references(() => user.id),
    editedAt: timestamp("edited_at").notNull().defaultNow(),
    kommentar: text("kommentar"),
  },
  (t) => [index("knowledge_revisions_knowledge_idx").on(t.knowledgeId)],
);

/* ── Feedback / Bug-Reports ───────────────────────────────────────────────── */
/*
  Meldungen der Nutzer über die App (Fehler oder Verbesserungsvorschlag).
  Der Auto-Kontext (seite, app_version, user_agent) wird SERVERSEITIG beim
  Absenden befüllt — der Melder muss nichts davon wissen. `antwort` ist die
  Rückmeldung eines Super-Admins und für den Melder sichtbar. Alle Meldungen
  sehen und bearbeiten nur Super-Admins.
*/
export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  typ: feedbackTyp("typ").notNull().default("fehler"),
  titel: text("titel").notNull(),
  beschreibung: text("beschreibung").notNull(),
  // Auto-Kontext beim Absenden:
  seite: text("seite"),
  appVersion: text("app_version"),
  userAgent: text("user_agent"),
  screenshotUrl: text("screenshot_url"),
  status: feedbackStatus("status").notNull().default("offen"),
  antwort: text("antwort"),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* Versand-Protokoll ALLER System-Mails (Einladungen, Passwort-Reset,
   Adressbestätigung, Wartungs-Erinnerungen, Feedback-Benachrichtigungen …):
   wann, an wen, welcher Betreff/Text, Erfolg oder Fehler. Geschrieben „best
   effort" beim Versand (sendeMail in lib/email.ts) — ein Log-Fehler darf den
   Mailversand nie brechen. `feedback_id` verknüpft feedback-bezogene Mails für
   die Inline-Historie in der Triage. */
export const mailLog = pgTable("mail_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  kategorie: text("kategorie").notNull(),
  empfaenger: text("empfaenger").notNull(),
  betreff: text("betreff").notNull(),
  inhalt: text("inhalt"), // Klartext-Zusammenfassung des Inhalts
  feedbackId: uuid("feedback_id").references(() => feedback.id, {
    onDelete: "set null",
  }),
  erfolg: boolean("erfolg").notNull().default(true),
  fehler: text("fehler"),
  gesendetAm: timestamp("gesendet_am").notNull().defaultNow(),
});

/* KI-Prompt-Overrides: der STANDARD jedes Prompts liegt im Code (lib/prompts.ts),
   hier stehen nur ABWEICHUNGEN. Scope ist exklusiv: global (hersteller +
   generation_id beide NULL) ODER pro Hersteller ODER pro Generation. Beim Lesen
   gewinnt der spezifischste Treffer (Generation > Hersteller > global > Code).
   NULLS NOT DISTINCT, damit die globale Zeile je key eindeutig bleibt. */
export const promptOverrides = pgTable(
  "prompt_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(), // PromptKey aus lib/prompts.ts
    hersteller: text("hersteller"), // NULL = nicht auf Hersteller beschränkt
    generationId: uuid("generation_id").references(() => generations.id, {
      onDelete: "cascade",
    }), // NULL = nicht auf Generation beschränkt
    vorlage: text("vorlage").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    updatedBy: text("updated_by").references(() => user.id),
  },
  (t) => [
    unique("prompt_overrides_scope_unique")
      .on(t.key, t.hersteller, t.generationId)
      .nullsNotDistinct(),
  ],
);

/* Troubleshooting-Guides sind seit dem Datenmodell-Redesign (Phase 2) Modell-
   Wissen in `knowledge` (typ='troubleshooting') — die eigene Tabelle
   `troubleshooting_guides` ist entfallen. */

/* ── Standard-Wartungspläne (Vorlagen je Nutzer / je Club) ────────────────── */
/*
  Der Code-Katalog (lib/maintenance-catalog.ts) ist nur das TEMPLATE. Darüber
  liegen editierbare Standards: MEHRERE benannte Pläne je Nutzer (userId) bzw.
  je Club (clubId) — der Name ist je Besitzer eindeutig; optional aus dem
  Template geseedet. Maschinen können einen
  Standard VERKNÜPFEN (machines.maintenance_plan_id): Änderungen am Standard
  propagieren auf die verknüpften Maschinen-Tasks (siehe
  db/actions/maintenance-plans.ts) — der per-Maschine-ZUSTAND (Fälligkeit,
  Historie) bleibt dabei erhalten, weil die Task-Zeilen bestehen bleiben und
  nur ihre Felder aktualisiert werden.
*/
export const maintenancePlans = pgTable(
  "maintenance_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    // Genau EIN Besitzer je Plan (Check unten): Nutzer ODER Club. Mehrere
    // Pläne je Besitzer sind erlaubt (Name eindeutig, Indizes unten).
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    clubId: uuid("club_id").references(() => clubs.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check(
      "maintenance_plans_genau_ein_besitzer",
      sql`num_nonnulls(${t.userId}, ${t.clubId}) = 1`,
    ),
    // Mehrere Pläne je Besitzer erlaubt — nur der NAME ist je Besitzer
    // eindeutig (case-insensitiv), Muster wie machine_besitzer.
    uniqueIndex("maintenance_plans_user_name_unique")
      .on(t.userId, sql`lower(${t.name})`)
      .where(sql`user_id IS NOT NULL`),
    uniqueIndex("maintenance_plans_club_name_unique")
      .on(t.clubId, sql`lower(${t.name})`)
      .where(sql`club_id IS NOT NULL`),
  ],
);

export const maintenancePlanItems = pgTable("maintenance_plan_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => maintenancePlans.id, { onDelete: "cascade" }),
  titel: text("titel").notNull(),
  kategorie: text("kategorie"),
  bauteil: text("bauteil"),
  taetigkeit: text("taetigkeit"),
  beschreibung: text("beschreibung"),
  prioritaet: maintenancePrioritaet("prioritaet").notNull().default("mittel"),
  intervallTyp: maintenanceIntervallTyp("intervall_typ")
    .notNull()
    .default("bedarf"),
  intervallTage: integer("intervall_tage"),
  intervallText: text("intervall_text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── Wartungsplan (interaktiv, mit Historie & Erinnerung) ─────────────────── */
/*
  Je Gerät eine Liste von Wartungspunkten (`maintenance_tasks`) plus eine
  Historie erledigter Wartungen (`maintenance_log`). Spiegelt bewusst das
  repairs-Muster (per-Gerät, datiert, geloggt).

  Fälligkeit nur zeitbasiert: nur `intervallTyp = "zeit"` (mit `intervallTage`)
  ergibt eine `naechsteFaelligkeit`; „spiele"/„bedarf" sind Checkliste ohne
  Termin. `zuletztErledigt`/`naechsteFaelligkeit`/`zuletztErinnert` sind bewusst
  denormalisiert, damit In-App-Fälligkeit und der Reminder-Cron ohne Aggregation
  über die Historie auskommen (aktualisiert beim Erledigen/Ändern).
*/
export const maintenanceTasks = pgTable("maintenance_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  machineId: uuid("machine_id")
    .notNull()
    .references(() => machines.id, { onDelete: "cascade" }),
  // Gesetzt = dieser Punkt wird vom verknüpften Standard VERWALTET (Felder
  // kommen aus maintenance_plan_items, per-Maschine editieren ist gesperrt);
  // null = eigener Punkt. SET NULL: gelöschte Plan-Punkte koppeln ab, statt
  // Maschinen-Historie zu vernichten (Feinregel in maintenance-plans.ts).
  planItemId: uuid("plan_item_id").references(() => maintenancePlanItems.id, {
    onDelete: "set null",
  }),
  titel: text("titel").notNull(),
  kategorie: text("kategorie"), // Freitext (wie faults.kategorie)
  bauteil: text("bauteil"),
  taetigkeit: text("taetigkeit"), // Prüfen / Reinigen / Ersetzen / Testen …
  beschreibung: text("beschreibung"),
  prioritaet: maintenancePrioritaet("prioritaet").notNull().default("mittel"),
  intervallTyp: maintenanceIntervallTyp("intervall_typ")
    .notNull()
    .default("bedarf"),
  intervallTage: integer("intervall_tage"), // nur bei intervallTyp "zeit"
  intervallText: text("intervall_text"), // Original-Label, z. B. „500 Spiele / monatlich"
  aktiv: boolean("aktiv").notNull().default(true),
  zuletztErledigt: timestamp("zuletzt_erledigt"),
  naechsteFaelligkeit: timestamp("naechste_faelligkeit"), // nur bei „zeit"
  zuletztErinnert: timestamp("zuletzt_erinnert"), // Cron-Dedup (siehe reminders-Route)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const maintenanceLog = pgTable("maintenance_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => maintenanceTasks.id, { onDelete: "cascade" }),
  // Denormalisiert für einfache maschinen-bezogene Queries/Autorisierung.
  machineId: uuid("machine_id")
    .notNull()
    .references(() => machines.id, { onDelete: "cascade" }),
  datum: timestamp("datum").notNull().defaultNow(),
  erledigtVon: text("erledigt_von").references(() => user.id),
  notiz: text("notiz"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── Relations (für db.query-Eager-Loading) ───────────────────────────────── */

export const clubsRelations = relations(clubs, ({ many }) => ({
  roleAssignments: many(roleAssignments),
  machines: many(machines),
  invitations: many(invitations),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  assignments: many(roleAssignments),
}));

export const roleAssignmentsRelations = relations(
  roleAssignments,
  ({ one }) => ({
    user: one(user, {
      fields: [roleAssignments.userId],
      references: [user.id],
    }),
    role: one(roles, {
      fields: [roleAssignments.roleId],
      references: [roles.id],
    }),
    club: one(clubs, {
      fields: [roleAssignments.clubId],
      references: [clubs.id],
    }),
  }),
);

export const invitationsRelations = relations(invitations, ({ one }) => ({
  club: one(clubs, {
    fields: [invitations.clubId],
    references: [clubs.id],
  }),
  role: one(roles, {
    fields: [invitations.roleId],
    references: [roles.id],
  }),
}));

export const machineModelsRelations = relations(machineModels, ({ many }) => ({
  machines: many(machines),
}));

export const machinesRelations = relations(machines, ({ one, many }) => ({
  club: one(clubs, {
    fields: [machines.clubId],
    references: [clubs.id],
  }),
  model: one(machineModels, {
    fields: [machines.modelId],
    references: [machineModels.id],
  }),
  faults: many(faults),
  repairs: many(repairs),
  maintenanceTasks: many(maintenanceTasks),
}));

export const maintenanceTasksRelations = relations(
  maintenanceTasks,
  ({ one, many }) => ({
    machine: one(machines, {
      fields: [maintenanceTasks.machineId],
      references: [machines.id],
    }),
    logs: many(maintenanceLog),
  }),
);

export const maintenanceLogRelations = relations(maintenanceLog, ({ one }) => ({
  task: one(maintenanceTasks, {
    fields: [maintenanceLog.taskId],
    references: [maintenanceTasks.id],
  }),
}));

export const faultsRelations = relations(faults, ({ one, many }) => ({
  machine: one(machines, {
    fields: [faults.machineId],
    references: [machines.id],
  }),
  repairs: many(repairs),
  repairFaults: many(repairFaults),
}));

export const repairsRelations = relations(repairs, ({ one, many }) => ({
  machine: one(machines, {
    fields: [repairs.machineId],
    references: [machines.id],
  }),
  // Primärer Fehler (Rückwärtskompatibilität + geteilte Ansicht).
  fault: one(faults, {
    fields: [repairs.faultId],
    references: [faults.id],
  }),
  // Alle behobenen Fehler (n:m).
  repairFaults: many(repairFaults),
}));

export const repairFaultsRelations = relations(repairFaults, ({ one }) => ({
  repair: one(repairs, {
    fields: [repairFaults.repairId],
    references: [repairs.id],
  }),
  fault: one(faults, {
    fields: [repairFaults.faultId],
    references: [faults.id],
  }),
}));
