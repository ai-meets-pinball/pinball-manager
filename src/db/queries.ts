import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  or,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  clubs,
  emailTemplates,
  machines,
  roleAssignments,
  roles,
} from "@/db/schema";
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

/** Club-IDs, in denen der Nutzer Mitglied ist. */
export async function getUserClubIds(userId: string) {
  const rows = await db
    .select({ clubId: roleAssignments.clubId })
    .from(roleAssignments)
    .where(
      and(
        eq(roleAssignments.userId, userId),
        isNotNull(roleAssignments.clubId),
      ),
    );
  return rows.map((r) => r.clubId).filter((id): id is string => id !== null);
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
