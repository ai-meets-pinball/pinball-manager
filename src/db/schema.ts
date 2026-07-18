import { relations, sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
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
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  // Welche Club-Rolle die Annahme vergibt (Katalog-FK statt Enum).
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.id),
  token: text("token").notNull().unique(),
  invitedBy: text("invited_by")
    .notNull()
    .references(() => user.id),
  status: text("status").notNull().default("pending"), // pending | accepted | revoked
  expiresAt: timestamp("expires_at").notNull(),
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

/* ── Phase-2-Stub: extrahierte Faktendaten ────────────────────────────────── */
/* Bewusst schon im Schema, damit es kohärent bleibt — es gibt aber noch KEINE UI. */

export const machineData = pgTable("machine_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  machineId: uuid("machine_id")
    .notNull()
    .references(() => machines.id, { onDelete: "cascade" }),
  typ: text("typ").notNull(), // "solenoids" | "switches" | "parts"
  daten: jsonb("daten").notNull(),
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

export const machinesRelations = relations(machines, ({ one, many }) => ({
  club: one(clubs, {
    fields: [machines.clubId],
    references: [clubs.id],
  }),
  faults: many(faults),
  repairs: many(repairs),
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
