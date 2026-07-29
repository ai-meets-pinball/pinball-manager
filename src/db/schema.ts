import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
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

/* ── Clubs ────────────────────────────────────────────────────────────────── */

export const clubs = pgTable("clubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
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

/* ── Gerätetyp-Katalog ────────────────────────────────────────────────────── */
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
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
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
  // Verweis auf den geteilten Gerätetyp. Nullable: Handeingaben ohne OPDB
  // bleiben erlaubt (können später zugeordnet werden).
  modelId: uuid("model_id").references(() => machineModels.id),
  hersteller: text("hersteller").notNull(),
  modell: text("modell").notNull(),
  baujahr: integer("baujahr"),
  opdbRef: text("opdb_ref"),
  ipdbRef: text("ipdb_ref"),
  fotoUrl: text("foto_url"),
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
    // Gerätetyp, auf den sich das Wissen bezieht — der Anker zum Wiederfinden.
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
  name: text("name").notNull(), // z. B. "WPC-95"
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
    clubId: uuid("club_id").references(() => clubs.id, { onDelete: "set null" }),
    // Rückverweis für Forks (Phase 5); Phase 1 ungenutzt, daher (noch) ohne FK.
    forkedFromId: uuid("forked_from_id"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check(
      "knowledge_genau_eine_ebene",
      sql`num_nonnulls(${t.generationId}, ${t.modelId}, ${t.machineId}) = 1`,
    ),
  ],
);

/* ── Troubleshooting-Guide (Phase 3) ──────────────────────────────────────── */
/*
  Ein von Claude erzeugter FAQ- & Troubleshooting-Guide je Maschine. Er wird nur
  angeboten, wenn schon Handbuch-Fakten vorliegen (Lampenmatrix o. ä.) — siehe
  lib/troubleshooting.ts. Anders als machine_data ist das KEIN Handbuch-Text,
  sondern von Claude generierte Inhalte (kein Copyright-Thema), darum dürfen sie
  gespeichert werden.

  Genau EINE Zeile je Maschine (Neu-Erzeugen ersetzt sie). `daten` hält den
  strukturierten Guide (plattform + Abschnitte + Quellen, siehe
  troubleshootingGuideSchema in lib/validators.ts).
*/
export const troubleshootingGuides = pgTable("troubleshooting_guides", {
  id: uuid("id").primaryKey().defaultRandom(),
  machineId: uuid("machine_id")
    .notNull()
    .unique()
    .references(() => machines.id, { onDelete: "cascade" }),
  daten: jsonb("daten").notNull(),
  // Welches Modell den Guide erzeugt hat — für Transparenz (Lehrbeispiel).
  model: text("model").notNull(),
  // Wurde der Guide mit Websuche (Community-Quellen) erstellt? Der lokale
  // Ollama-Pfad kann NICHT websuchen → false; so lässt sich die geringere
  // Verlässlichkeit in der Anzeige kennzeichnen. Bestehende Claude-Zeilen: true.
  websuche: boolean("websuche").notNull().default(true),
  erstelltVon: text("erstellt_von").references(() => user.id),
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
  titel: text("titel").notNull(),
  kategorie: text("kategorie"), // Freitext (wie faults.kategorie)
  bauteil: text("bauteil"),
  taetigkeit: text("taetigkeit"), // Prüfen / Reinigen / Ersetzen / Testen …
  beschreibung: text("beschreibung"),
  prioritaet: maintenancePrioritaet("prioritaet").notNull().default("mittel"),
  intervallTyp: maintenanceIntervallTyp("intervall_typ").notNull().default("bedarf"),
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

export const roleAssignmentsRelations = relations(roleAssignments, ({ one }) => ({
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
}));

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
  troubleshootingGuide: one(troubleshootingGuides, {
    fields: [machines.id],
    references: [troubleshootingGuides.machineId],
  }),
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
}));

export const repairsRelations = relations(repairs, ({ one }) => ({
  machine: one(machines, {
    fields: [repairs.machineId],
    references: [machines.id],
  }),
  fault: one(faults, {
    fields: [repairs.faultId],
    references: [faults.id],
  }),
}));
