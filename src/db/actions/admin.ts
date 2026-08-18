"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { clubs, roleAssignments, roles } from "@/db/schema";
import { istLetzterOwner } from "@/lib/rechte";
import {
  countClubOwners,
  getClubRole,
  requireSuperAdmin,
  roleIdByKey,
} from "@/lib/session";
import {
  CLUB_ROLES,
  KURATOR_ROLE,
  SUPERADMIN_ROLE,
} from "@/lib/validators";
import type { FormState } from "@/db/actions/form-state";

/** Vergebbare globale Rollen (per /admin). Founder o. Ä. ließen sich hier ergänzen. */
const VERGEBBARE_GLOBALE_ROLLEN = [
  SUPERADMIN_ROLE,
  KURATOR_ROLE,
] as const;

/** Eine globale Rolle geben oder entziehen (nur Super-Admin).
    Der letzte Super-Admin bleibt geschützt. */
export async function setGlobalRole(formData: FormData): Promise<void> {
  await requireSuperAdmin();

  const userId = String(formData.get("userId"));
  const rolle = String(formData.get("rolle"));
  const grant = String(formData.get("grant")) === "true";
  if (!VERGEBBARE_GLOBALE_ROLLEN.includes(rolle as never)) {
    throw new Error("Unbekannte Rolle");
  }
  const roleId = await roleIdByKey(rolle);

  if (grant) {
    await db
      .insert(roleAssignments)
      .values({ userId, roleId })
      .onConflictDoNothing();
  } else {
    // Mindestens ein Super-Admin muss übrig bleiben.
    if (rolle === SUPERADMIN_ROLE) {
      const alle = await db
        .select({ userId: roleAssignments.userId })
        .from(roleAssignments)
        .where(
          and(eq(roleAssignments.roleId, roleId), isNull(roleAssignments.clubId)),
        );
      if (alle.length <= 1 && alle.some((a) => a.userId === userId)) {
        throw new Error("Der letzte Super-Admin kann nicht entfernt werden");
      }
    }

    await db
      .delete(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, userId),
          eq(roleAssignments.roleId, roleId),
          isNull(roleAssignments.clubId),
        ),
      );
  }

  revalidatePath("/admin");
}

/** Rollen-Katalog (für die Anzeige im Admin-Bereich). */
export async function listRoles() {
  return db.select().from(roles).orderBy(roles.scope, roles.rang);
}

/*
  Club-Rollen zentral vergeben (nur Super-Admin). Ergänzt den regulären Weg im
  Club (Owner/Admin lädt ein) — der Super-Admin darf direkt zuweisen (wie der
  Owner-Insert in createClub). Eine Club-Rolle braucht IMMER einen Club, und die
  „mind. 1 Owner"-Invariante gilt genauso wie in changeMemberRole/removeMember.
*/
export async function setClubRoleForUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSuperAdmin();

  const userId = String(formData.get("userId"));
  const clubId = String(formData.get("clubId"));
  const rolle = String(formData.get("rolle"));

  if (!CLUB_ROLES.includes(rolle as never)) {
    return { error: "Unbekannte Club-Rolle" };
  }
  // Club-Pflicht: eine Club-Rolle existiert nie ohne Club.
  if (!clubId) return { error: "Bitte einen Club angeben" };
  const club = await db.query.clubs.findFirst({ where: eq(clubs.id, clubId) });
  if (!club) return { error: "Club nicht gefunden" };

  const aktuelle = await getClubRole(userId, clubId);
  if (aktuelle === rolle) return {};

  // Letzten Owner nicht herabstufen.
  if (rolle !== "owner" && istLetzterOwner(aktuelle, await countClubOwners(clubId))) {
    return { error: "Ein Club braucht mindestens einen Owner" };
  }

  const roleId = await roleIdByKey(rolle);
  if (aktuelle) {
    await db
      .update(roleAssignments)
      .set({ roleId })
      .where(
        and(
          eq(roleAssignments.userId, userId),
          eq(roleAssignments.clubId, clubId),
        ),
      );
  } else {
    await db
      .insert(roleAssignments)
      .values({ userId, clubId, roleId })
      .onConflictDoNothing();
  }

  revalidatePath("/admin");
  return { message: `${club.name}: Rolle gesetzt.` };
}

/** Eine Club-Rolle entziehen (nur Super-Admin). ≥1-Owner-Invariante gilt. */
export async function removeClubRoleForUser(formData: FormData): Promise<void> {
  await requireSuperAdmin();

  const userId = String(formData.get("userId"));
  const clubId = String(formData.get("clubId"));

  const rolle = await getClubRole(userId, clubId);
  if (!rolle) return;
  if (istLetzterOwner(rolle, await countClubOwners(clubId))) {
    throw new Error("Ein Club braucht mindestens einen Owner");
  }

  await db
    .delete(roleAssignments)
    .where(
      and(
        eq(roleAssignments.userId, userId),
        eq(roleAssignments.clubId, clubId),
      ),
    );

  revalidatePath("/admin");
}
