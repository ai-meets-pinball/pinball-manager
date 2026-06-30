"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clubs, machines, memberships, user } from "@/db/schema";
import { isClubAdmin, requireUser } from "@/lib/session";
import { addMemberSchema, clubSchema } from "@/lib/validators";

export type FormState = { error?: string };

export async function createClub(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const currentUser = await requireUser();
  const parsed = clubSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  const [club] = await db
    .insert(clubs)
    .values({ name: parsed.data.name, createdBy: currentUser.id })
    .returning({ id: clubs.id });

  // Der Ersteller wird automatisch Admin-Mitglied.
  await db.insert(memberships).values({
    clubId: club.id,
    userId: currentUser.id,
    rolle: "admin",
  });

  revalidatePath("/clubs");
  redirect(`/clubs/${club.id}`);
}

export async function addMember(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const currentUser = await requireUser();
  const clubId = String(formData.get("clubId"));

  if (!(await isClubAdmin(currentUser.id, clubId))) {
    return { error: "Nur Club-Admins dürfen Mitglieder hinzufügen" };
  }

  const parsed = addMemberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  const target = await db.query.user.findFirst({
    where: eq(user.email, parsed.data.email),
  });
  if (!target) {
    return { error: "Kein Nutzer mit dieser E-Mail gefunden" };
  }

  const existing = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.clubId, clubId),
      eq(memberships.userId, target.id),
    ),
  });
  if (existing) {
    return { error: "Nutzer ist bereits Mitglied" };
  }

  await db.insert(memberships).values({
    clubId,
    userId: target.id,
    rolle: parsed.data.rolle,
  });

  revalidatePath(`/clubs/${clubId}`);
  return {};
}

export async function removeMember(formData: FormData): Promise<void> {
  const currentUser = await requireUser();
  const clubId = String(formData.get("clubId"));
  const userId = String(formData.get("userId"));

  if (!(await isClubAdmin(currentUser.id, clubId))) {
    throw new Error("Nur Club-Admins dürfen Mitglieder entfernen");
  }
  if (userId === currentUser.id) {
    throw new Error("Du kannst dich nicht selbst entfernen");
  }

  await db
    .delete(memberships)
    .where(
      and(eq(memberships.clubId, clubId), eq(memberships.userId, userId)),
    );

  revalidatePath(`/clubs/${clubId}`);
}

export async function deleteClub(formData: FormData): Promise<void> {
  const currentUser = await requireUser();
  const clubId = String(formData.get("clubId"));

  if (!(await isClubAdmin(currentUser.id, clubId))) {
    throw new Error("Nur Club-Admins dürfen den Club löschen");
  }

  // Maschinen des Clubs werden nicht gelöscht, sondern entkoppelt (bleiben beim Eigentümer).
  await db
    .update(machines)
    .set({ clubId: null })
    .where(eq(machines.clubId, clubId));

  // Mitgliedschaften werden per ON DELETE CASCADE entfernt.
  await db.delete(clubs).where(eq(clubs.id, clubId));

  revalidatePath("/clubs");
  redirect("/clubs");
}
