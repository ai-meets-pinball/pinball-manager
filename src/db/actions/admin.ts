"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/session";

/** Globale Rolle setzen (nur Super-Admin). Der letzte Super-Admin bleibt geschützt. */
export async function setUserRole(formData: FormData): Promise<void> {
  await requireSuperAdmin();

  const userId = String(formData.get("userId"));
  const role = String(formData.get("role"));
  if (role !== "user" && role !== "superadmin") {
    throw new Error("Ungültige Rolle");
  }

  if (role === "user") {
    const admins = await db.query.user.findMany({
      where: eq(user.role, "superadmin"),
      columns: { id: true },
    });
    if (admins.length <= 1 && admins.some((a) => a.id === userId)) {
      throw new Error("Der letzte Super-Admin kann nicht entfernt werden");
    }
  }

  await db.update(user).set({ role }).where(eq(user.id, userId));
  revalidatePath("/admin");
}
