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

/** Alle Club-Rollen je Nutzer (für die Admin-Übersicht). Der innerJoin auf
    `clubs` filtert automatisch auf club-bezogene Zuweisungen (globale haben
    club_id = NULL und fallen raus). */
export async function getClubRolesByUser() {
  return db
    .select({
      userId: roleAssignments.userId,
      clubId: clubs.id,
      clubName: clubs.name,
      rolle: roles.key,
    })
    .from(roleAssignments)
    .innerJoin(clubs, eq(roleAssignments.clubId, clubs.id))
    .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
    .orderBy(clubs.name);
}

/** Alle Clubs (id + Name) für Auswahlfelder (z. B. Club-Rollen-Vergabe im Admin). */
export async function getAllClubsBasic() {
  return db
    .select({ id: clubs.id, name: clubs.name })
    .from(clubs)
    .orderBy(clubs.name);
}
