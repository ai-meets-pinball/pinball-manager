"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { roleAssignments, roles } from "@/db/schema";
import { requireSuperAdmin, roleIdByKey } from "@/lib/session";
import { SUPERADMIN_ROLE } from "@/lib/validators";

/** Globale Super-Admin-Rolle geben oder entziehen (nur Super-Admin).
    Der letzte Super-Admin bleibt geschützt. */
export async function setSuperAdmin(formData: FormData): Promise<void> {
  await requireSuperAdmin();

  const userId = String(formData.get("userId"));
  const grant = String(formData.get("grant")) === "true";
  const roleId = await roleIdByKey(SUPERADMIN_ROLE);

  if (grant) {
    await db
      .insert(roleAssignments)
      .values({ userId, roleId })
      .onConflictDoNothing();
  } else {
    // Mindestens ein Super-Admin muss übrig bleiben.
    const alle = await db
      .select({ userId: roleAssignments.userId })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.roleId, roleId),
          isNull(roleAssignments.clubId),
        ),
      );
    if (alle.length <= 1 && alle.some((a) => a.userId === userId)) {
      throw new Error("Der letzte Super-Admin kann nicht entfernt werden");
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
