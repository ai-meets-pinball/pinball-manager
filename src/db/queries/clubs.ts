import {
  eq,
} from "drizzle-orm";
import { db } from "@/db";
import {
  clubs,
  roleAssignments,
  roles,
} from "@/db/schema";

/* Clubs: Übersichten für Mitglieder und für die Supporter-Rolle. */

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
