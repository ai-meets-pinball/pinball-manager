import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  clubs,
  emailTemplates,
  machineData,
  machines,
  roleAssignments,
  roles,
  shareTargets,
  shares,
  user,
} from "@/db/schema";
import {
  getUserClubIds,
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
 * Geteilte Handbuch-Fakten zu einem Gerätetyp, die dieser Nutzer sehen darf —
 * ohne die eigene Maschine (deren Fakten stehen ohnehin schon auf der Seite).
 *
 * Die Sichtbarkeit kommt aus `shareVisibilityFilter` (lib/sharing.ts), damit es
 * nur EINEN Ort für die Regel gibt.
 */
export async function getSharedFactsForModel(
  currentUser: SessionUser,
  modelId: string,
  exkludiereMachineId?: string,
) {
  const sichtbar = await shareVisibilityFilter(currentUser);

  const zeilen = await db
    .select({
      shareId: shares.id,
      machineId: shares.artefaktId,
      anonym: shares.anonym,
      ownerName: user.name,
      hersteller: machines.hersteller,
      modell: machines.modell,
    })
    .from(shares)
    .innerJoin(machines, eq(machines.id, shares.artefaktId))
    .innerJoin(user, eq(user.id, shares.ownerId))
    .where(
      and(
        eq(shares.artefaktTyp, "machine_facts"),
        eq(shares.modelId, modelId),
        exkludiereMachineId
          ? ne(shares.artefaktId, exkludiereMachineId)
          : undefined,
        sichtbar,
      ),
    );

  // Zu jeder Freigabe die aktuellen Faktentabellen laden (Freigabe zeigt auf die
  // MASCHINE, nicht auf Faktenzeilen — sie folgt damit automatisch dem Stand).
  return Promise.all(
    zeilen.map(async (z) => ({
      ...z,
      fakten: await db.query.machineData.findMany({
        where: eq(machineData.machineId, z.machineId),
      }),
    })),
  );
}

/** Die eigene Freigabe einer Maschine (oder null). */
export async function getFactsShare(machineId: string) {
  const share = await db.query.shares.findFirst({
    where: and(
      eq(shares.artefaktTyp, "machine_facts"),
      eq(shares.artefaktId, machineId),
    ),
  });
  if (!share) return null;
  const ziele = await db.query.shareTargets.findMany({
    where: eq(shareTargets.shareId, share.id),
  });
  return { ...share, ziele };
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
