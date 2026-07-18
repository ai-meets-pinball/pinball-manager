"use server";

import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clubs, invitations, roleAssignments, user } from "@/db/schema";
import {
  sendInvitationEmail,
  sendPlatformInvitationEmail,
} from "@/lib/email";
import {
  getClubRole,
  isClubOwner,
  isSuperAdmin,
  requireClubManager,
  requireSuperAdmin,
  requireUser,
  roleIdByKey,
} from "@/lib/session";
import { inviteSchema } from "@/lib/validators";
import type { FormState } from "@/db/actions/clubs";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage

/** Basis-URL für Einladungslinks (Better-Auth-URL, sonst lokaler Dev-Port). */
function baseUrl() {
  return (
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3100"
  );
}

/** Owner/Admin lädt eine E-Mail ein (bestehendes Konto oder neu). */
export async function inviteMember(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const clubId = String(formData.get("clubId"));
  const currentUser = await requireClubManager(clubId);

  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const email = parsed.data.email.toLowerCase();
  const rolle = parsed.data.rolle;

  // Zum Owner einladen dürfen nur Owner (oder Super-Admin).
  if (
    rolle === "owner" &&
    !isSuperAdmin(currentUser) &&
    !(await isClubOwner(currentUser.id, clubId))
  ) {
    return { error: "Nur Owner dürfen jemanden zum Owner einladen" };
  }

  // Bereits Mitglied? (= hat schon eine Rolle in diesem Club)
  const existingUser = await db.query.user.findFirst({
    where: eq(user.email, email),
  });
  if (existingUser && (await getClubRole(existingUser.id, clubId))) {
    return { error: "Nutzer ist bereits Mitglied" };
  }

  // Nur ein offener Invite je (clubId, email) — bestehende offene entwerten.
  await db
    .update(invitations)
    .set({ status: "revoked" })
    .where(
      and(
        eq(invitations.clubId, clubId),
        eq(invitations.email, email),
        eq(invitations.status, "pending"),
      ),
    );

  const token = randomBytes(24).toString("hex");
  await db.insert(invitations).values({
    clubId,
    email,
    roleId: await roleIdByKey(rolle),
    token,
    invitedBy: currentUser.id,
    status: "pending",
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  const club = await db.query.clubs.findFirst({ where: eq(clubs.id, clubId) });
  try {
    await sendInvitationEmail(
      email,
      `${baseUrl()}/invite/${token}`,
      club?.name ?? "Club",
      currentUser.name,
    );
  } catch (e) {
    console.error("[invite] email:", (e as Error).message);
    return {
      error: "Einladung gespeichert, aber der E-Mail-Versand ist fehlgeschlagen.",
    };
  }

  revalidatePath(`/clubs/${clubId}`);
  return { message: `Einladung an ${email} verschickt.` };
}

/** Plattform-Einladung (ohne Club): berechtigt nur zur Registrierung.
    Nur Super-Admins. */
export async function invitePlatformUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const currentUser = await requireSuperAdmin();

  const parsed = z
    .object({ email: z.string().trim().email("Gültige E-Mail erforderlich") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const email = parsed.data.email.toLowerCase();

  const vorhanden = await db.query.user.findFirst({
    where: eq(user.email, email),
  });
  if (vorhanden) {
    return { error: "Es gibt bereits ein Konto mit dieser E-Mail." };
  }

  // Offene Plattform-Einladung für diese Adresse ersetzen.
  await db
    .update(invitations)
    .set({ status: "revoked" })
    .where(
      and(
        eq(invitations.email, email),
        eq(invitations.status, "pending"),
        isNull(invitations.clubId),
      ),
    );

  const token = randomBytes(24).toString("hex");
  await db.insert(invitations).values({
    clubId: null,
    roleId: null,
    email,
    token,
    invitedBy: currentUser.id,
    status: "pending",
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  try {
    await sendPlatformInvitationEmail(
      email,
      `${baseUrl()}/register?invite=${token}`,
      currentUser.name,
    );
  } catch (e) {
    console.error("[invite] platform email:", (e as Error).message);
    return {
      error: "Einladung gespeichert, aber der E-Mail-Versand ist fehlgeschlagen.",
    };
  }

  revalidatePath("/admin");
  return { message: `Einladung an ${email} verschickt.` };
}

/** Gemeinsame Annahme-Logik. Legt (idempotent) die Mitgliedschaft an und markiert
    die Einladung als akzeptiert. Liefert die clubId oder einen Fehler.
    Bei einer Plattform-Einladung (clubId = NULL) wird nur quittiert. */
async function acceptForUser(
  token: string,
  userId: string,
  userEmail: string,
): Promise<{ clubId?: string; error?: string }> {
  const inv = await db.query.invitations.findFirst({
    where: eq(invitations.token, token),
  });
  if (!inv || inv.status !== "pending") {
    return { error: "Einladung ungültig oder bereits verwendet." };
  }
  if (inv.expiresAt.getTime() < Date.now()) {
    return { error: "Einladung ist abgelaufen." };
  }
  if (inv.email.toLowerCase() !== userEmail.toLowerCase()) {
    return { error: "Diese Einladung gilt für eine andere E-Mail-Adresse." };
  }

  // Club-Einladung: Rollenzuweisung = Mitgliedschaft (idempotent).
  // Plattform-Einladung (clubId/roleId NULL): nichts zuzuweisen, nur quittieren.
  if (inv.clubId && inv.roleId) {
    if (!(await getClubRole(userId, inv.clubId))) {
      await db
        .insert(roleAssignments)
        .values({ clubId: inv.clubId, userId, roleId: inv.roleId })
        .onConflictDoNothing();
    }
  }
  await db
    .update(invitations)
    .set({ status: "accepted" })
    .where(eq(invitations.id, inv.id));

  return { clubId: inv.clubId ?? undefined };
}

/** Einladung annehmen (Button auf der Invite-Landing-Seite). */
export async function acceptInvitation(formData: FormData): Promise<void> {
  const token = String(formData.get("token"));
  const currentUser = await requireUser();
  const res = await acceptForUser(token, currentUser.id, currentUser.email);
  if (res.error) throw new Error(res.error);
  revalidatePath("/clubs");
  redirect(`/clubs/${res.clubId}`);
}

/** Für den Sign-up-über-Invite-Fluss: nimmt an, ohne zu redirecten. */
export async function acceptInvitationAction(
  token: string,
): Promise<{ clubId?: string; error?: string }> {
  const currentUser = await requireUser();
  const res = await acceptForUser(token, currentUser.id, currentUser.email);
  if (!res.error) revalidatePath("/clubs");
  return res;
}

/** Einladung ablehnen (Empfänger). Nur für die eigene E-Mail. */
export async function declineInvitation(formData: FormData): Promise<void> {
  const invitationId = String(formData.get("invitationId"));
  const currentUser = await requireUser();

  const inv = await db.query.invitations.findFirst({
    where: eq(invitations.id, invitationId),
  });
  if (!inv || inv.email.toLowerCase() !== currentUser.email.toLowerCase()) {
    throw new Error("Einladung nicht gefunden");
  }

  await db
    .update(invitations)
    .set({ status: "revoked" })
    .where(eq(invitations.id, invitationId));

  revalidatePath("/account");
}

/** Offene Plattform-Einladung zurückziehen (nur Super-Admin). */
export async function revokePlatformInvitation(
  formData: FormData,
): Promise<void> {
  await requireSuperAdmin();
  const invitationId = String(formData.get("invitationId"));

  await db
    .update(invitations)
    .set({ status: "revoked" })
    .where(
      and(eq(invitations.id, invitationId), isNull(invitations.clubId)),
    );

  revalidatePath("/admin");
}

/** Offene Einladung zurückziehen (Manager). */
export async function revokeInvitation(formData: FormData): Promise<void> {
  const clubId = String(formData.get("clubId"));
  const invitationId = String(formData.get("invitationId"));
  await requireClubManager(clubId);

  await db
    .update(invitations)
    .set({ status: "revoked" })
    .where(
      and(eq(invitations.id, invitationId), eq(invitations.clubId, clubId)),
    );

  revalidatePath(`/clubs/${clubId}`);
}
