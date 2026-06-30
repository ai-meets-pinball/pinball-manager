import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { machines, memberships } from "@/db/schema";
import { auth } from "@/lib/auth";

/*
  Das Herzstück der sichtbaren Autorisierung.

  Es gibt KEIN Row-Level-Security in der Datenbank. Jeder Zugriffspfad läuft
  bewusst durch eine dieser Funktionen, damit die Regeln im TypeScript-Code
  nachlesbar bleiben (PRD §3, §7).
*/

/** Aktuell angemeldeter Nutzer (oder null). In Server Components / Server Actions verwendbar. */
export async function getCurrentUser() {
  // In Next 16 ist headers() async — sonst liefert getSession null.
  const sessionData = await auth.api.getSession({ headers: await headers() });
  return sessionData?.user ?? null;
}

/** Erzwingt eine Anmeldung; leitet sonst auf /login um. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Ist der Nutzer Mitglied des Clubs? */
export async function isClubMember(userId: string, clubId: string) {
  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, userId), eq(memberships.clubId, clubId)),
  });
  return Boolean(membership);
}

/** Ist der Nutzer Admin des Clubs? (für Mitgliederverwaltung / Löschen) */
export async function isClubAdmin(userId: string, clubId: string) {
  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, userId), eq(memberships.clubId, clubId)),
  });
  return membership?.rolle === "admin";
}

/**
 * Zugriff auf eine Maschine: erlaubt, wenn der Nutzer Eigentümer ist ODER
 * Mitglied des zugeordneten Clubs. Wirft sonst — die eine Regel, überall wiederverwendet.
 * Fehler und Reparaturen erben ihre Autorisierung hierüber (via fault.machineId).
 */
export async function requireMachineAccess(machineId: string) {
  const user = await requireUser();
  const machine = await db.query.machines.findFirst({
    where: eq(machines.id, machineId),
  });
  if (!machine) notFound();

  const erlaubt =
    machine.ownerId === user.id ||
    (machine.clubId !== null &&
      (await isClubMember(user.id, machine.clubId)));

  if (!erlaubt) {
    throw new Error("Kein Zugriff auf diese Maschine");
  }

  return { user, machine };
}

/** Mitgliedschaft erzwingen (für Club-Detailseiten). */
export async function requireClubMember(clubId: string) {
  const user = await requireUser();
  if (!(await isClubMember(user.id, clubId))) {
    throw new Error("Kein Zugriff auf diesen Club");
  }
  return user;
}
