"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clubs, machines, roleAssignments } from "@/db/schema";
import { darfClub, istLetzterOwner } from "@/lib/rechte";
import {
  countClubOwners,
  getClubRole,
  requireClubManager,
  requireClubOwner,
  requireUser,
  roleIdByKey,
} from "@/lib/session";
import { uploadClubLogo } from "@/lib/storage";
import { clubSchema, roleChangeSchema } from "@/lib/validators";
import type { FormState } from "@/db/actions/form-state";
// Hinweis: Mitglieder werden per Einladung hinzugefügt — siehe actions/invitations.ts.
// Eine club-bezogene Rollenzuweisung IST die Mitgliedschaft (keine memberships-Tabelle).

/** Turniermodus eines Clubs an/aus schalten (nur Owner/Admin). Geteilt — alle
    Mitglieder sehen den Dashboard-Alarm. */
export async function toggleTurniermodus(formData: FormData): Promise<void> {
  const clubId = String(formData.get("clubId") ?? "");
  await requireClubManager(clubId);
  const club = await db.query.clubs.findFirst({
    where: eq(clubs.id, clubId),
    columns: { turniermodus: true },
  });
  if (!club) return;
  await db
    .update(clubs)
    .set({ turniermodus: !club.turniermodus })
    .where(eq(clubs.id, clubId));
  revalidatePath("/dashboard");
  revalidatePath(`/clubs/${clubId}`);
}

export async function createClub(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const currentUser = await requireUser();
  const parsed = clubSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  // Optionales Vereins-Logo (JPG/PNG/SVG).
  let logoUrl: string | null = null;
  try {
    logoUrl = await uploadClubLogo(
      formData.get("logo") as File | null,
      currentUser.id,
    );
  } catch (e) {
    return { error: (e as Error).message };
  }

  const [club] = await db
    .insert(clubs)
    .values({ name: parsed.data.name, logoUrl, createdBy: currentUser.id })
    .returning({ id: clubs.id });

  // Der Ersteller wird automatisch Owner (= zugleich seine Mitgliedschaft).
  await db.insert(roleAssignments).values({
    userId: currentUser.id,
    clubId: club.id,
    roleId: await roleIdByKey("owner"),
  });

  revalidatePath("/clubs");
  redirect(`/clubs/${club.id}`);
}

/** Vereins-Logo setzen oder entfernen (Owner/Admin). JPG, PNG oder SVG. */
export async function setClubLogo(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const clubId = String(formData.get("clubId") ?? "");
  const currentUser = await requireClubManager(clubId);

  if (String(formData.get("entfernen") ?? "") === "true") {
    await db.update(clubs).set({ logoUrl: null }).where(eq(clubs.id, clubId));
    revalidatePath(`/clubs/${clubId}`);
    return { message: "Logo entfernt." };
  }

  let logoUrl: string | null;
  try {
    logoUrl = await uploadClubLogo(
      formData.get("logo") as File | null,
      currentUser.id,
    );
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!logoUrl) return { error: "Bitte eine Logo-Datei wählen." };

  await db.update(clubs).set({ logoUrl }).where(eq(clubs.id, clubId));
  revalidatePath(`/clubs/${clubId}`);
  return { message: "Logo gespeichert." };
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

  const eigeneRolle = await getClubRole(currentUser.id, clubId);
  const aktuelleRolle = await getClubRole(targetUserId, clubId);
  if (!aktuelleRolle) return { error: "Mitglied nicht gefunden" };
  if (aktuelleRolle === neueRolle) return {};

  // Owner-betreffende Änderungen (rein oder raus) nur durch Owner / Super-Admin.
  const betrifftOwner = neueRolle === "owner" || aktuelleRolle === "owner";
  if (betrifftOwner && !darfClub(currentUser, eigeneRolle).ownerVergeben) {
    return {
      error: "Nur Owner dürfen die Owner-Rolle vergeben oder entziehen",
    };
  }

  // Letzten Owner nicht degradieren.
  if (istLetzterOwner(aktuelleRolle, await countClubOwners(clubId))) {
    return { error: "Ein Club braucht mindestens einen Owner" };
  }

  await db
    .update(roleAssignments)
    .set({ roleId: await roleIdByKey(neueRolle) })
    .where(
      and(
        eq(roleAssignments.clubId, clubId),
        eq(roleAssignments.userId, targetUserId),
      ),
    );

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

  const zielRolle = await getClubRole(userId, clubId);
  if (!zielRolle) return;

  // Owner dürfen nur von Ownern/Super-Admins entfernt werden.
  if (
    zielRolle === "owner" &&
    !darfClub(currentUser, await getClubRole(currentUser.id, clubId))
      .ownerVergeben
  ) {
    throw new Error("Nur Owner dürfen einen Owner entfernen");
  }
  // Letzten Owner nicht entfernen.
  if (istLetzterOwner(zielRolle, await countClubOwners(clubId))) {
    throw new Error("Ein Club braucht mindestens einen Owner");
  }

  await db
    .delete(roleAssignments)
    .where(
      and(
        eq(roleAssignments.clubId, clubId),
        eq(roleAssignments.userId, userId),
      ),
    );

  revalidatePath(`/clubs/${clubId}`);
}

/** Selbst-Austritt aus einem Club. Der letzte Owner muss vorher jemanden befördern. */
export async function leaveClub(formData: FormData): Promise<void> {
  const clubId = String(formData.get("clubId"));
  const currentUser = await requireUser();

  const eigeneRolle = await getClubRole(currentUser.id, clubId);
  if (!eigeneRolle) throw new Error("Du bist kein Mitglied dieses Clubs");

  if (istLetzterOwner(eigeneRolle, await countClubOwners(clubId))) {
    throw new Error(
      "Als letzter Owner kannst du nicht austreten — befördere zuerst jemanden zum Owner",
    );
  }

  await db
    .delete(roleAssignments)
    .where(
      and(
        eq(roleAssignments.clubId, clubId),
        eq(roleAssignments.userId, currentUser.id),
      ),
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

  // Rollenzuweisungen und Einladungen entfernt ON DELETE CASCADE.
  await db.delete(clubs).where(eq(clubs.id, clubId));

  revalidatePath("/clubs");
  redirect("/clubs");
}
