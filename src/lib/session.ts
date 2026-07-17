import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { machines, memberships, user } from "@/db/schema";
import { auth } from "@/lib/auth";

/*
  Das Herzstück der sichtbaren Autorisierung.

  Es gibt KEIN Row-Level-Security in der Datenbank. Jeder Zugriffspfad läuft
  bewusst durch eine dieser Funktionen, damit die Regeln im TypeScript-Code
  nachlesbar bleiben (PRD §3, §7).
*/

/** Bootstrap-Allowlist für Super-Admins (Komma-Liste in der Env). Diese Konten
    werden beim nächsten Login automatisch zu Super-Admins hochgestuft. */
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

/** Aktuell angemeldeter Nutzer (oder null). In Server Components / Server Actions verwendbar.
    Überlagert die effektive Rolle anhand der SUPER_ADMIN_EMAILS-Allowlist und schreibt
    eine abweichende gespeicherte Rolle einmalig zurück. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  // In Next 16 ist headers() async — sonst liefert getSession null.
  const sessionData = await auth.api.getSession({ headers: await headers() });
  const u = sessionData?.user;
  if (!u) return null;

  const stored = (u as { role?: string }).role ?? "user";
  const shouldBeSuper = SUPER_ADMIN_EMAILS.includes(u.email.toLowerCase());

  if (shouldBeSuper && stored !== "superadmin") {
    await db.update(user).set({ role: "superadmin" }).where(eq(user.id, u.id));
    return { id: u.id, name: u.name, email: u.email, role: "superadmin" };
  }
  return { id: u.id, name: u.name, email: u.email, role: stored };
}

/** Erzwingt eine Anmeldung; leitet sonst auf /login um. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/* ── Globale Rolle ────────────────────────────────────────────────────────── */

/** Ist der Nutzer Super-Admin (darf alles administrieren)? */
export function isSuperAdmin(user: { role?: string } | null): boolean {
  return user?.role === "superadmin";
}

/** Super-Admin erzwingen (für /admin). */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isSuperAdmin(user)) throw new Error("Kein Zugriff (nur Super-Admin)");
  return user;
}

/* ── Club-Rollen ──────────────────────────────────────────────────────────── */

/** Ist der Nutzer Mitglied des Clubs? */
export async function isClubMember(userId: string, clubId: string) {
  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, userId), eq(memberships.clubId, clubId)),
  });
  return Boolean(membership);
}

/** Owner = oberste Club-Rolle (befördert Owner, löscht den Club). */
export async function isClubOwner(userId: string, clubId: string) {
  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, userId), eq(memberships.clubId, clubId)),
  });
  return membership?.rolle === "owner";
}

/** Manager = Owner ODER Admin (darf Mitglieder/Einladungen verwalten). */
export async function isClubManager(userId: string, clubId: string) {
  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, userId), eq(memberships.clubId, clubId)),
  });
  return membership?.rolle === "owner" || membership?.rolle === "admin";
}

/** Anzahl der Owner eines Clubs — für die „mind. 1 Owner"-Invariante. */
export async function countClubOwners(clubId: string) {
  const owners = await db.query.memberships.findMany({
    where: and(eq(memberships.clubId, clubId), eq(memberships.rolle, "owner")),
  });
  return owners.length;
}

/**
 * Zugriff auf eine Maschine: erlaubt, wenn der Nutzer Eigentümer ist, Super-Admin ist
 * ODER Mitglied des zugeordneten Clubs. Wirft sonst — die eine Regel, überall wiederverwendet.
 * Fehler und Reparaturen erben ihre Autorisierung hierüber (via fault.machineId).
 */
export async function requireMachineAccess(machineId: string) {
  const user = await requireUser();
  const machine = await db.query.machines.findFirst({
    where: eq(machines.id, machineId),
  });
  if (!machine) notFound();

  const erlaubt =
    isSuperAdmin(user) ||
    machine.ownerId === user.id ||
    (machine.clubId !== null && (await isClubMember(user.id, machine.clubId)));

  if (!erlaubt) {
    throw new Error("Kein Zugriff auf diese Maschine");
  }

  return { user, machine };
}

/** Mitgliedschaft erzwingen (für Club-Detailseiten). Super-Admin darf immer. */
export async function requireClubMember(clubId: string) {
  const user = await requireUser();
  if (!isSuperAdmin(user) && !(await isClubMember(user.id, clubId))) {
    throw new Error("Kein Zugriff auf diesen Club");
  }
  return user;
}

/** Club-Verwaltung (Mitglieder/Einladungen): Owner, Admin oder Super-Admin. */
export async function requireClubManager(clubId: string) {
  const user = await requireUser();
  if (!isSuperAdmin(user) && !(await isClubManager(user.id, clubId))) {
    throw new Error("Nur Club-Owner/-Admins dürfen das");
  }
  return user;
}

/** Owner-Aktionen (Owner befördern, Club löschen): nur Owner oder Super-Admin. */
export async function requireClubOwner(clubId: string) {
  const user = await requireUser();
  if (!isSuperAdmin(user) && !(await isClubOwner(user.id, clubId))) {
    throw new Error("Nur Club-Owner dürfen das");
  }
  return user;
}
