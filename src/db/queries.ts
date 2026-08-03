import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  clubs,
  clubSettings,
  emailTemplates,
  faults,
  generations,
  knowledge,
  knowledgeOverrides,
  knowledgeSignals,
  machineModels,
  machines,
  maintenanceLog,
  maintenanceTasks,
  repairs,
  roleAssignments,
  roles,
  shareTargets,
  shares,
  user,
  userSettings,
} from "@/db/schema";
import { SHARE_DEFAULTS, type ShareDefaults } from "@/lib/share-defaults";
import {
  getUserClubIds,
  isKurator,
  isSuperAdmin,
  type SessionUser,
} from "@/lib/session";
import {
  DEFAULT_TEMPLATES,
  type ResolvedTemplate,
  type TemplateKey,
} from "@/lib/email-templates";

/** E-Mail-Vorlage laden: DB-Eintrag falls angepasst, sonst der Standard aus dem
    Code. Liegt hier (Server-Seite), damit lib/email-templates.ts client-safe
    bleibt — sonst landet der Postgres-Treiber im Client-Bundle. */
export async function getTemplate(
  key: TemplateKey,
): Promise<ResolvedTemplate> {
  const row = await db.query.emailTemplates.findFirst({
    where: eq(emailTemplates.key, key),
  });
  if (row) return { subject: row.subject, body: row.body, angepasst: true };
  const std = DEFAULT_TEMPLATES[key];
  return { subject: std.subject, body: std.body, angepasst: false };
}

/* Lesbare, wiederverwendbare Lese-Queries.
   Mitgliedschaft = eine club-bezogene Rollenzuweisung (role_assignments.clubId). */

/* getUserClubIds liegt in lib/session.ts bei den übrigen Mitgliedschafts-Helfern
   (verhindert den Zyklus queries → sharing → queries) und wird hier nur re-exportiert,
   damit bestehende Importe unverändert funktionieren. */
export { getUserClubIds } from "@/lib/session";

/** Alle Clubs (für Supporter: nur-lesende Übersicht). `rolle: null`, damit die
    Form mit getUserClubs übereinstimmt (keine eigene Rolle im fremden Club). */
export async function getAllClubs() {
  const rows = await db
    .select({ id: clubs.id, name: clubs.name })
    .from(clubs)
    .orderBy(clubs.name);
  return rows.map((c) => ({ ...c, rolle: null as string | null }));
}

/** Clubs des Nutzers (inkl. Rollen-Key). */
export async function getUserClubs(userId: string) {
  return db
    .select({
      id: clubs.id,
      name: clubs.name,
      rolle: roles.key,
    })
    .from(roleAssignments)
    .innerJoin(clubs, eq(roleAssignments.clubId, clubs.id))
    .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
    .where(eq(roleAssignments.userId, userId))
    .orderBy(clubs.name);
}

/*
  ── Sichtbarkeit von Freigaben ────────────────────────────────────────────
  Steht bewusst direkt neben getVisibleMachines: beides sind Sichtbarkeitsregeln,
  und die Erfahrung mit requireMachineAccess ⇄ getVisibleMachines zeigt, dass
  getrennte Orte auseinanderlaufen.

    platform — alle angemeldeten Nutzer (die App liegt ohnehin hinter requireUser)
    club     — Mitglieder der in share_targets genannten Clubs
    users    — die benannten Nutzer, unabhängig vom Club
*/

/** SQL-Bedingung: welche Freigaben darf dieser Nutzer sehen?
    `undefined` = keine Einschränkung (Super-Admin sieht alles). */
async function shareVisibilityFilter(
  currentUser: SessionUser,
): Promise<SQL | undefined> {
  if (isSuperAdmin(currentUser)) return undefined;

  const clubIds = await getUserClubIds(currentUser.id);

  const clubZiele = db
    .select({ id: shareTargets.shareId })
    .from(shareTargets)
    .where(clubIds.length > 0 ? inArray(shareTargets.clubId, clubIds) : sql`false`);

  const nutzerZiele = db
    .select({ id: shareTargets.shareId })
    .from(shareTargets)
    .where(eq(shareTargets.userId, currentUser.id));

  return or(
    eq(shares.ownerId, currentUser.id), // eigene Freigaben immer
    eq(shares.scope, "platform"),
    and(eq(shares.scope, "club"), inArray(shares.id, clubZiele)),
    and(eq(shares.scope, "users"), inArray(shares.id, nutzerZiele)),
  );
}

/** Einzelprüfung — dieselbe Regel wie shareVisibilityFilter. */
export async function canSeeShare(
  currentUser: SessionUser,
  share: { id: string; ownerId: string; scope: string },
): Promise<boolean> {
  if (isSuperAdmin(currentUser)) return true;
  if (share.ownerId === currentUser.id) return true;
  if (share.scope === "platform") return true;

  const ziele = await db.query.shareTargets.findMany({
    where: eq(shareTargets.shareId, share.id),
  });

  if (share.scope === "users") {
    return ziele.some((z) => z.userId === currentUser.id);
  }
  if (share.scope === "club") {
    const clubIds = await getUserClubIds(currentUser.id);
    return ziele.some((z) => z.clubId !== null && clubIds.includes(z.clubId));
  }
  return false;
}

/**
 * Geteilte Reparaturen zu einem Modell — die wachsende Reparaturdatenbank.
 *
 * Die Feldprojektion passiert HIER, serverseitig: Kosten/Aufwand und der Name
 * des Urhebers werden gar nicht erst geladen bzw. auf null gesetzt, wenn die
 * Freigabe sie nicht freigibt. Ein Ausblenden erst im JSX würde die Werte an
 * den Client ausliefern.
 */
export async function getSharedRepairsForModel(
  currentUser: SessionUser,
  modelId: string,
  exkludiereMachineId?: string,
) {
  const sichtbar = await shareVisibilityFilter(currentUser);

  const zeilen = await db
    .select({
      shareId: shares.id,
      anonym: shares.anonym,
      zeigeKosten: shares.zeigeKosten,
      ownerName: user.name,
      repairId: repairs.id,
      datum: repairs.datum,
      status: repairs.status,
      diagnose: repairs.diagnose,
      massnahme: repairs.massnahme,
      teile: repairs.teile,
      kosten: repairs.kosten,
      zeit: repairs.zeit,
      faultBeschreibung: faults.beschreibung,
      faultKategorie: faults.kategorie,
    })
    .from(shares)
    .innerJoin(repairs, eq(repairs.id, shares.artefaktId))
    .innerJoin(machines, eq(machines.id, repairs.machineId))
    .innerJoin(user, eq(user.id, shares.ownerId))
    .leftJoin(faults, eq(faults.id, repairs.faultId))
    .where(
      and(
        eq(shares.artefaktTyp, "repair"),
        eq(shares.modelId, modelId),
        exkludiereMachineId
          ? ne(repairs.machineId, exkludiereMachineId)
          : undefined,
        sichtbar,
      ),
    )
    .orderBy(desc(repairs.datum));

  // Projektion anwenden — verborgene Felder verlassen den Server nicht.
  return zeilen.map((z) => ({
    shareId: z.shareId,
    repairId: z.repairId,
    datum: z.datum,
    status: z.status,
    diagnose: z.diagnose,
    massnahme: z.massnahme,
    teile: z.teile,
    faultBeschreibung: z.faultBeschreibung,
    faultKategorie: z.faultKategorie,
    kosten: z.zeigeKosten ? z.kosten : null,
    zeit: z.zeigeKosten ? z.zeit : null,
    herkunft: z.anonym ? null : z.ownerName,
  }));
}

/** Ein Modell (machine_models) per id — für die Typ-Seite. */
export async function getMachineModel(modelId: string) {
  return db.query.machineModels.findFirst({
    where: eq(machineModels.id, modelId),
  });
}

/* ── Wissensbasis (Datenmodell-Redesign, Phase 1) ─────────────────────────── */

/** Die EINE Sichtbarkeitsregel für `knowledge` (analog shareVisibilityFilter).
    Autor sieht immer eigenes; öffentlich sieht jeder; club nur Clubmitglieder;
    Super-Admin sieht alles (undefined = keine Einschränkung).

    Kuratoren-Moderation: von Kuratoren verborgene Einträge (verborgen_am
    gesetzt) verschwinden für alle — AUSSER für den Autor (sieht sein Eigenes
    immer, markiert samt Begründung), für Kuratoren (sehen alles Geteilte,
    Privates bleibt privat) und für Super-Admins. */
async function knowledgeVisibilityFilter(
  currentUser: SessionUser,
): Promise<SQL | undefined> {
  if (isSuperAdmin(currentUser)) return undefined;
  if (isKurator(currentUser)) {
    return or(
      eq(knowledge.createdBy, currentUser.id),
      ne(knowledge.visibility, "privat"),
    );
  }
  const clubIds = await getUserClubIds(currentUser.id);
  const nichtVerborgen = isNull(knowledge.verborgenAm);
  const parts: (SQL | undefined)[] = [
    // Autor sieht Eigenes IMMER — auch verborgen (wird markiert, nicht versteckt).
    eq(knowledge.createdBy, currentUser.id),
    and(eq(knowledge.visibility, "oeffentlich"), nichtVerborgen),
  ];
  if (clubIds.length > 0) {
    parts.push(
      and(
        eq(knowledge.visibility, "club"),
        inArray(knowledge.clubId, clubIds),
        nichtVerborgen,
      ),
    );
  }
  return or(...parts);
}

/** Autor-/Sichtbarkeits-behaftete Auswahl eines Wissenseintrags — inkl.
    Community-Signalzähler (Phase 5) und dem eigenen Signal des Nutzers. */
function knowledgeAuswahl(userId: string) {
  return {
    id: knowledge.id,
    titel: knowledge.titel,
    inhalt: knowledge.inhalt,
    visibility: knowledge.visibility,
    sourceType: knowledge.sourceType,
    createdAt: knowledge.createdAt,
    autorId: knowledge.createdBy,
    autorName: user.name,
    hilfreich: sql<number>`(select count(*) from ${knowledgeSignals} where ${knowledgeSignals.knowledgeId} = ${knowledge.id} and ${knowledgeSignals.wert} = 'hilfreich')::int`,
    falsch: sql<number>`(select count(*) from ${knowledgeSignals} where ${knowledgeSignals.knowledgeId} = ${knowledge.id} and ${knowledgeSignals.wert} = 'falsch')::int`,
    meinSignal: sql<
      "hilfreich" | "falsch" | null
    >`(select ${knowledgeSignals.wert} from ${knowledgeSignals} where ${knowledgeSignals.knowledgeId} = ${knowledge.id} and ${knowledgeSignals.userId} = ${userId} limit 1)`,
    ausgeblendet: sql<boolean>`exists(select 1 from ${knowledgeOverrides} where ${knowledgeOverrides.knowledgeId} = ${knowledge.id} and ${knowledgeOverrides.userId} = ${userId})`,
    // Kuratoren-Moderation: gesetzt = für alle verborgen. Der Autoren-Join auf
    // `user` ist schon belegt, daher Subselect für den Kuratoren-Namen.
    verborgenAm: knowledge.verborgenAm,
    verborgenGrund: knowledge.verborgenGrund,
    verborgenVonName: sql<
      string | null
    >`(select ${user.name} from ${user} where ${user.id} = ${knowledge.verborgenVon})`,
  } as const;
}

/** Darf dieser Nutzer diesen Wissenseintrag sehen? (Dieselbe Regel wie oben.)
    Server-seitiger Gate für Community-Signale — man signalisiert nur, was man
    auch sehen darf. */
export async function knowledgeSichtbarFuer(
  currentUser: SessionUser,
  knowledgeId: string,
): Promise<boolean> {
  const sichtbar = await knowledgeVisibilityFilter(currentUser);
  const [row] = await db
    .select({ id: knowledge.id })
    .from(knowledge)
    .where(and(eq(knowledge.id, knowledgeId), sichtbar));
  return Boolean(row);
}

/** Sichtbare Handbuch-Fakten (typ='handbuch_fakten') eines Modells (Modell). */
export async function getModelKnowledge(
  currentUser: SessionUser,
  modelId: string,
) {
  const sichtbar = await knowledgeVisibilityFilter(currentUser);
  return db
    .select(knowledgeAuswahl(currentUser.id))
    .from(knowledge)
    .innerJoin(user, eq(user.id, knowledge.createdBy))
    .where(
      and(
        eq(knowledge.typ, "handbuch_fakten"),
        eq(knowledge.modelId, modelId),
        sichtbar,
      ),
    )
    .orderBy(desc(knowledge.updatedAt));
}

/** Sichtbare Handbuch-Fakten einer Maschine ohne Modell (Maschinen-Ebene). */
export async function getMachineKnowledge(
  currentUser: SessionUser,
  machineId: string,
) {
  const sichtbar = await knowledgeVisibilityFilter(currentUser);
  return db
    .select(knowledgeAuswahl(currentUser.id))
    .from(knowledge)
    .innerJoin(user, eq(user.id, knowledge.createdBy))
    .where(
      and(
        eq(knowledge.typ, "handbuch_fakten"),
        eq(knowledge.machineId, machineId),
        sichtbar,
      ),
    )
    .orderBy(desc(knowledge.updatedAt));
}

/* Wie knowledgeAuswahl, zusätzlich die Generation-Zuordnung eines Eintrags —
   damit ein auf Generation-Ebene angelegter Guide („gilt für WPC-95") kenntlich
   gemacht werden kann. generationName ist null für Modell-/Maschinen-Einträge. */
function guideAuswahl(userId: string) {
  return {
    ...knowledgeAuswahl(userId),
    generationId: knowledge.generationId,
    generationName: generations.name,
  } as const;
}

/** Die Generation eines Modells (oder null) — für die Ebene-Wahl beim Guide. */
export async function getModelGeneration(modelId: string) {
  const [row] = await db
    .select({ id: generations.id, name: generations.name })
    .from(machineModels)
    .innerJoin(generations, eq(generations.id, machineModels.generationId))
    .where(eq(machineModels.id, modelId));
  return row ?? null;
}

/**
 * Sichtbare Troubleshooting-Guides eines Modells — inklusive der Guides, die
 * auf der GENERATION dieses Modells liegen (Generation-Resolver): Wissen einer
 * Board-/Hardware-Generation gilt für alle ihre Modelle. Fakten bleiben bewusst
 * modell-exakt (Editionsunterschiede) und werden hier NICHT aufgelöst.
 */
export async function getModelGuides(currentUser: SessionUser, modelId: string) {
  const sichtbar = await knowledgeVisibilityFilter(currentUser);
  const [model] = await db
    .select({ generationId: machineModels.generationId })
    .from(machineModels)
    .where(eq(machineModels.id, modelId));
  const ebene = model?.generationId
    ? or(
        eq(knowledge.modelId, modelId),
        eq(knowledge.generationId, model.generationId),
      )
    : eq(knowledge.modelId, modelId);

  return db
    .select(guideAuswahl(currentUser.id))
    .from(knowledge)
    .innerJoin(user, eq(user.id, knowledge.createdBy))
    .leftJoin(generations, eq(generations.id, knowledge.generationId))
    .where(and(eq(knowledge.typ, "troubleshooting"), ebene, sichtbar))
    .orderBy(desc(knowledge.updatedAt));
}

/** Sichtbare Troubleshooting-Guides einer Maschine ohne Modell (kein
    Generation-Bezug möglich). */
export async function getMachineGuides(
  currentUser: SessionUser,
  machineId: string,
) {
  const sichtbar = await knowledgeVisibilityFilter(currentUser);
  return db
    .select(guideAuswahl(currentUser.id))
    .from(knowledge)
    .innerJoin(user, eq(user.id, knowledge.createdBy))
    .leftJoin(generations, eq(generations.id, knowledge.generationId))
    .where(
      and(
        eq(knowledge.typ, "troubleshooting"),
        eq(knowledge.machineId, machineId),
        sichtbar,
      ),
    )
    .orderBy(desc(knowledge.updatedAt));
}

/** Wissensbasis-Katalog: Modelle mit für den Nutzer sichtbarem Wissen —
    gezählt werden ALLE Wissenseinträge (Handbuch-Infos, Guides, …), nicht nur
    Handbuch-Extrakte. */
export async function getKnowledgeModels(currentUser: SessionUser) {
  const sichtbar = await knowledgeVisibilityFilter(currentUser);
  return db
    .select({
      modelId: machineModels.id,
      hersteller: machineModels.hersteller,
      modell: machineModels.modell,
      baujahr: machineModels.baujahr,
      imageUrl: machineModels.imageUrl,
      eintraege: sql<number>`count(*)::int`,
    })
    .from(knowledge)
    .innerJoin(machineModels, eq(machineModels.id, knowledge.modelId))
    .where(sichtbar)
    .groupBy(machineModels.id)
    .orderBy(machineModels.modell, machineModels.hersteller);
}

/** Kuratierungs-Übersicht (Seite /kuratierung): gemeldete und verborgene
    GETEILTE Wissenseinträge. Bewusst OHNE persönlichen Sichtbarkeitsfilter —
    Kuratoren moderieren alles Geteilte; Privates taucht hier nie auf.
    Der Aufrufer sichert den Zugriff mit `kannKuratieren` ab. */
export async function getKuratierungsUebersicht() {
  // Dieselben Zähl-Subselects wie in knowledgeAuswahl.
  const hilfreich = sql<number>`(select count(*) from ${knowledgeSignals} where ${knowledgeSignals.knowledgeId} = ${knowledge.id} and ${knowledgeSignals.wert} = 'hilfreich')::int`;
  const falsch = sql<number>`(select count(*) from ${knowledgeSignals} where ${knowledgeSignals.knowledgeId} = ${knowledge.id} and ${knowledgeSignals.wert} = 'falsch')::int`;

  const auswahl = {
    id: knowledge.id,
    typ: knowledge.typ,
    titel: knowledge.titel,
    visibility: knowledge.visibility,
    autorName: user.name,
    modelId: knowledge.modelId,
    machineId: knowledge.machineId,
    generationName: generations.name,
    hilfreich,
    falsch,
    verborgenAm: knowledge.verborgenAm,
    verborgenGrund: knowledge.verborgenGrund,
    verborgenVonName: sql<
      string | null
    >`(select ${user.name} from ${user} where ${user.id} = ${knowledge.verborgenVon})`,
  } as const;

  // Gemeldet = dieselbe Schwelle wie das KnowledgeGemeldet-Banner (rein
  // anzeigend — verborgen wird nur von Hand, am Eintrag selbst).
  const gemeldet = await db
    .select(auswahl)
    .from(knowledge)
    .innerJoin(user, eq(user.id, knowledge.createdBy))
    .leftJoin(generations, eq(generations.id, knowledge.generationId))
    .where(
      and(
        ne(knowledge.visibility, "privat"),
        isNull(knowledge.verborgenAm),
        sql`${falsch} >= 2 and ${falsch} > ${hilfreich}`,
      ),
    )
    .orderBy(desc(knowledge.updatedAt));

  const verborgen = await db
    .select(auswahl)
    .from(knowledge)
    .innerJoin(user, eq(user.id, knowledge.createdBy))
    .leftJoin(generations, eq(generations.id, knowledge.generationId))
    .where(isNotNull(knowledge.verborgenAm))
    .orderBy(desc(knowledge.verborgenAm));

  return { gemeldet, verborgen };
}

/** Freigaben der Reparaturen EINER Maschine (für die eigenen Teilen-Schalter). */
export async function getRepairShares(machineId: string) {
  const zeilen = await db
    .select({
      artefaktId: shares.artefaktId,
      scope: shares.scope,
      anonym: shares.anonym,
      zeigeKosten: shares.zeigeKosten,
    })
    .from(shares)
    .innerJoin(repairs, eq(repairs.id, shares.artefaktId))
    .where(
      and(eq(shares.artefaktTyp, "repair"), eq(repairs.machineId, machineId)),
    );
  return new Map(zeilen.map((z) => [z.artefaktId, z]));
}

/**
 * Freigabe-Voreinstellungen für eine Maschine.
 * Club-Maschine → Club-Einstellungen, sonst die des Eigentümers; fehlt die
 * Zeile, gilt der Standard aus dem Code.
 */
export async function getShareDefaults(machine: {
  ownerId: string;
  clubId: string | null;
}): Promise<ShareDefaults> {
  const row = machine.clubId
    ? await db.query.clubSettings.findFirst({
        where: eq(clubSettings.clubId, machine.clubId),
      })
    : await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, machine.ownerId),
      });

  if (!row) return SHARE_DEFAULTS;
  return {
    defaultScope: row.defaultScope as ShareDefaults["defaultScope"],
    defaultAnonym: row.defaultAnonym,
    defaultZeigeKosten: row.defaultZeigeKosten,
    autoShareFacts: row.autoShareFacts,
    autoShareRepairs: row.autoShareRepairs,
  };
}

/** Gespeicherte Einstellungen eines Nutzers bzw. Clubs (oder der Standard). */
export async function getSettingsFor(
  art: "user" | "club",
  id: string,
): Promise<{ werte: ShareDefaults; angepasst: boolean }> {
  const row =
    art === "user"
      ? await db.query.userSettings.findFirst({
          where: eq(userSettings.userId, id),
        })
      : await db.query.clubSettings.findFirst({
          where: eq(clubSettings.clubId, id),
        });
  if (!row) return { werte: SHARE_DEFAULTS, angepasst: false };
  return {
    werte: {
      defaultScope: row.defaultScope as ShareDefaults["defaultScope"],
      defaultAnonym: row.defaultAnonym,
      defaultZeigeKosten: row.defaultZeigeKosten,
      autoShareFacts: row.autoShareFacts,
      autoShareRepairs: row.autoShareRepairs,
    },
    angepasst: true,
  };
}

/**
 * Alle für den Nutzer sichtbaren Maschinen: eigene ODER aus seinen Clubs.
 * Optionaler Textfilter über Hersteller/Modell.
 */
export async function getVisibleMachines(userId: string, suche?: string) {
  const clubIds = await getUserClubIds(userId);

  const sichtbar = or(
    eq(machines.ownerId, userId),
    clubIds.length > 0 ? inArray(machines.clubId, clubIds) : undefined,
  );

  const filters: (SQL | undefined)[] = [sichtbar];
  if (suche && suche.trim()) {
    const q = `%${suche.trim()}%`;
    filters.push(or(ilike(machines.hersteller, q), ilike(machines.modell, q)));
  }

  return db.query.machines.findMany({
    where: and(...filters),
    with: { club: { columns: { name: true } } },
    orderBy: [desc(machines.createdAt)],
  });
}

/* ── Wartungsplan ─────────────────────────────────────────────────────────── */

export type MaintenanceStatus = "ueberfaellig" | "bald" | "ok" | "kein-termin";

/** Innerhalb dieses Fensters (Tage) gilt ein Termin als „bald fällig". */
const BALD_TAGE = 14;
const TAG_MS = 86_400_000;

const PRIO_RANG: Record<string, number> = {
  kritisch: 5,
  "sehr hoch": 4,
  hoch: 3,
  mittel: 2,
  niedrig: 1,
};
const STATUS_RANG: Record<MaintenanceStatus, number> = {
  ueberfaellig: 0,
  bald: 1,
  ok: 2,
  "kein-termin": 3,
};

/** Fälligkeit ableiten — nur zeitbasierte Punkte mit Termin haben einen Status. */
function faelligkeit(
  task: { intervallTyp: string; naechsteFaelligkeit: Date | null },
  now: number,
): { status: MaintenanceStatus; tageBisFaellig: number | null } {
  if (task.intervallTyp !== "zeit" || !task.naechsteFaelligkeit) {
    return { status: "kein-termin", tageBisFaellig: null };
  }
  const diff = task.naechsteFaelligkeit.getTime() - now;
  const tageBisFaellig = Math.ceil(diff / TAG_MS);
  if (diff < 0) return { status: "ueberfaellig", tageBisFaellig };
  if (diff <= BALD_TAGE * TAG_MS) return { status: "bald", tageBisFaellig };
  return { status: "ok", tageBisFaellig };
}

/** Wartungspunkte einer Maschine samt Historie und berechnetem Fälligkeits-
    Status, sortiert nach Dringlichkeit → Priorität → Titel. */
export async function getMaintenanceTasks(machineId: string) {
  const tasks = await db.query.maintenanceTasks.findMany({
    where: eq(maintenanceTasks.machineId, machineId),
    with: { logs: { orderBy: [desc(maintenanceLog.datum)] } },
  });
  const now = Date.now();
  return tasks
    .map((t) => ({ ...t, ...faelligkeit(t, now) }))
    .sort((a, b) => {
      const s = STATUS_RANG[a.status] - STATUS_RANG[b.status];
      if (s !== 0) return s;
      const p = (PRIO_RANG[b.prioritaet] ?? 0) - (PRIO_RANG[a.prioritaet] ?? 0);
      if (p !== 0) return p;
      return a.titel.localeCompare(b.titel, "de");
    });
}

/** Dashboard: anstehende Wartungen (überfällig oder bald fällig) über die
    sichtbaren Maschinen — samt Maschine, nach Termin sortiert. */
export async function getDueMaintenanceForMachines(machineIds: string[]) {
  if (machineIds.length === 0) return [];
  const rows = await db
    .select({
      id: maintenanceTasks.id,
      machineId: maintenanceTasks.machineId,
      titel: maintenanceTasks.titel,
      prioritaet: maintenanceTasks.prioritaet,
      intervallTyp: maintenanceTasks.intervallTyp,
      naechsteFaelligkeit: maintenanceTasks.naechsteFaelligkeit,
      hersteller: machines.hersteller,
      modell: machines.modell,
    })
    .from(maintenanceTasks)
    .innerJoin(machines, eq(machines.id, maintenanceTasks.machineId))
    .where(
      and(
        inArray(maintenanceTasks.machineId, machineIds),
        eq(maintenanceTasks.aktiv, true),
        // Fenster: überfällig + „bald" (dieselbe Grenze wie faelligkeit()).
        lte(
          maintenanceTasks.naechsteFaelligkeit,
          new Date(Date.now() + BALD_TAGE * TAG_MS),
        ),
      ),
    )
    .orderBy(maintenanceTasks.naechsteFaelligkeit);
  const now = Date.now();
  return rows.map((r) => ({ ...r, ...faelligkeit(r, now) }));
}

/** Dashboard: offene Fehler (Status ≠ behoben) über die sichtbaren Maschinen. */
export async function getOpenFaultsForMachines(machineIds: string[]) {
  if (machineIds.length === 0) return [];
  return db
    .select({
      id: faults.id,
      machineId: faults.machineId,
      beschreibung: faults.beschreibung,
      prioritaet: faults.prioritaet,
      status: faults.status,
      datum: faults.datum,
      hersteller: machines.hersteller,
      modell: machines.modell,
    })
    .from(faults)
    .innerJoin(machines, eq(machines.id, faults.machineId))
    .where(
      and(inArray(faults.machineId, machineIds), ne(faults.status, "behoben")),
    )
    .orderBy(desc(faults.datum));
}

/** Anzahl fälliger (überfällig oder heute) Wartungen je Maschine — für die
    Badges in der Maschinenliste. Nur aktive, zeitbasierte Punkte mit Termin. */
export async function getDueMaintenanceCountByMachine(machineIds: string[]) {
  const map = new Map<string, number>();
  if (machineIds.length === 0) return map;
  const rows = await db
    .select({ machineId: maintenanceTasks.machineId, n: count() })
    .from(maintenanceTasks)
    .where(
      and(
        inArray(maintenanceTasks.machineId, machineIds),
        eq(maintenanceTasks.aktiv, true),
        lte(maintenanceTasks.naechsteFaelligkeit, new Date()),
      ),
    )
    .groupBy(maintenanceTasks.machineId);
  for (const r of rows) map.set(r.machineId, Number(r.n));
  return map;
}
