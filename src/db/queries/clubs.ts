import {
  eq,
} from "drizzle-orm";
import { db } from "@/db";
import {
  clubs,
  roleAssignments,
  roles,
} from "@/db/schema";

/* Clubs: Übersichten für Mitglieder. */

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
