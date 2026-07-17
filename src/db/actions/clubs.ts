"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clubs, machines, memberships } from "@/db/schema";
import {
  countClubOwners,
  isClubOwner,
  isSuperAdmin,
  requireClubManager,
  requireClubOwner,
  requireUser,
} from "@/lib/session";
// Hinweis: Mitglieder werden per Einladung hinzugefügt — siehe actions/invitations.ts.
import { clubSchema, roleChangeSchema } from "@/lib/validators";

export type FormState = { error?: string; message?: string };

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

  // Der Ersteller wird automatisch Owner (oberste Rolle).
  await db.insert(memberships).values({
    clubId: club.id,
    userId: currentUser.id,
    rolle: "owner",
  });

  revalidatePath("/clubs");
  redirect(`/clubs/${club.id}`);
}

/** Rolle eines Mitglieds ändern (Manager). Owner betreffende Änderungen nur durch
    Owner; die „mind. 1 Owner"-Invariante wird erzwungen. */
export async function changeMemberRole(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const clubId = String(formData.get("clubId"));
  const targetUserId = String(formData.get("userId"));
  const currentUser = await requireClubManager(clubId);

  const parsed = roleChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const neueRolle = parsed.data.rolle;

  const target = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.clubId, clubId),
      eq(memberships.userId, targetUserId),
    ),
  });
  if (!target) return { error: "Mitglied nicht gefunden" };
  if (target.rolle === neueRolle) return {};

  // Owner-betreffende Änderungen (rein oder raus) nur durch Owner / Super-Admin.
  const betrifftOwner = neueRolle === "owner" || target.rolle === "owner";
  if (
    betrifftOwner &&
    !isSuperAdmin(currentUser) &&
    !(await isClubOwner(currentUser.id, clubId))
  ) {
    return { error: "Nur Owner dürfen die Owner-Rolle vergeben oder entziehen" };
  }

  // Letzten Owner nicht degradieren.
  if (target.rolle === "owner" && neueRolle !== "owner") {
    if ((await countClubOwners(clubId)) <= 1) {
      return { error: "Ein Club braucht mindestens einen Owner" };
    }
  }

  await db
    .update(memberships)
    .set({ rolle: neueRolle })
    .where(and(eq(memberships.clubId, clubId), eq(memberships.userId, targetUserId)));

  revalidatePath(`/clubs/${clubId}`);
  return {};
}

export async function removeMember(formData: FormData): Promise<void> {
  const clubId = String(formData.get("clubId"));
  const userId = String(formData.get("userId"));
  const currentUser = await requireClubManager(clubId);

  if (userId === currentUser.id) {
    throw new Error("Zum Austreten bitte »Club verlassen« verwenden");
  }

  const target = await db.query.memberships.findFirst({
    where: and(eq(memberships.clubId, clubId), eq(memberships.userId, userId)),
  });
  if (!target) return;

  // Owner dürfen nur von Ownern/Super-Admins entfernt werden.
  if (
    target.rolle === "owner" &&
    !isSuperAdmin(currentUser) &&
    !(await isClubOwner(currentUser.id, clubId))
  ) {
    throw new Error("Nur Owner dürfen einen Owner entfernen");
  }
  // Letzten Owner nicht entfernen.
  if (target.rolle === "owner" && (await countClubOwners(clubId)) <= 1) {
    throw new Error("Ein Club braucht mindestens einen Owner");
  }

  await db
    .delete(memberships)
    .where(and(eq(memberships.clubId, clubId), eq(memberships.userId, userId)));

  revalidatePath(`/clubs/${clubId}`);
}

/** Selbst-Austritt aus einem Club. Der letzte Owner muss vorher jemanden befördern. */
export async function leaveClub(formData: FormData): Promise<void> {
  const clubId = String(formData.get("clubId"));
  const currentUser = await requireUser();

  const own = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.clubId, clubId),
      eq(memberships.userId, currentUser.id),
    ),
  });
  if (!own) throw new Error("Du bist kein Mitglied dieses Clubs");

  if (own.rolle === "owner" && (await countClubOwners(clubId)) <= 1) {
    throw new Error(
      "Als letzter Owner kannst du nicht austreten — befördere zuerst jemanden zum Owner",
    );
  }

  await db
    .delete(memberships)
    .where(
      and(eq(memberships.clubId, clubId), eq(memberships.userId, currentUser.id)),
    );

  revalidatePath("/clubs");
  redirect("/clubs");
}

export async function deleteClub(formData: FormData): Promise<void> {
  const clubId = String(formData.get("clubId"));
  // Nur Owner (oder Super-Admin) dürfen den Club löschen.
  await requireClubOwner(clubId);

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
