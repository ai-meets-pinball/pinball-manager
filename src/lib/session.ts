import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { machines, roleAssignments, roles } from "@/db/schema";
import { auth } from "@/lib/auth";
import { istSuperAdminEmail } from "@/lib/super-admins";
import { SUPERADMIN_ROLE, SUPPORTER_ROLE } from "@/lib/validators";

/*
  Das Herzstück der sichtbaren Autorisierung.

  Es gibt KEIN Row-Level-Security in der Datenbank. Jeder Zugriffspfad läuft
  bewusst durch eine dieser Funktionen, damit die Regeln im TypeScript-Code
  nachlesbar bleiben (PRD §3, §7).

  Rollenmodell: EIN Katalog (`roles`) + Zuweisungen (`role_assignments`).
  clubId = NULL → globale Rolle (z. B. superadmin); clubId gesetzt → Rolle in
  genau diesem Club. Eine club-bezogene Zuweisung IST die Mitgliedschaft.
*/

/* Bootstrap-Allowlist (siehe lib/super-admins.ts): diese Konten erhalten beim
   nächsten Request automatisch die globale superadmin-Rolle. */

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  /** Globale Rollen-Keys (clubId = NULL), z. B. ["superadmin"]. */
  roles: string[];
};

/** Katalog-ID zu einem Rollen-Key. Wirft, wenn die Rolle fehlt (Seed-Fehler). */
export async function roleIdByKey(key: string): Promise<string> {
  const rolle = await db.query.roles.findFirst({ where: eq(roles.key, key) });
  if (!rolle) throw new Error(`Rolle "${key}" fehlt im roles-Katalog`);
  return rolle.id;
}

/** Globale Rollen-Keys eines Nutzers. */
async function globalRoleKeys(userId: string): Promise<string[]> {
  const rows = await db
    .select({ key: roles.key })
    .from(roleAssignments)
    .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
    .where(
      and(eq(roleAssignments.userId, userId), isNull(roleAssignments.clubId)),
    );
  return rows.map((r) => r.key);
}

/** Aktuell angemeldeter Nutzer (oder null). Lädt die globalen Rollen mit und
    stuft Konten aus SUPER_ADMIN_EMAILS einmalig zum Super-Admin hoch. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  // In Next 16 ist headers() async — sonst liefert getSession null.
  const sessionData = await auth.api.getSession({ headers: await headers() });
  const u = sessionData?.user;
  if (!u) return null;

  let keys = await globalRoleKeys(u.id);

  if (istSuperAdminEmail(u.email) && !keys.includes(SUPERADMIN_ROLE)) {
    await db
      .insert(roleAssignments)
      .values({ userId: u.id, roleId: await roleIdByKey(SUPERADMIN_ROLE) })
      .onConflictDoNothing();
    keys = [...keys, SUPERADMIN_ROLE];
  }

  return { id: u.id, name: u.name, email: u.email, roles: keys };
}

/** Erzwingt eine Anmeldung; leitet sonst auf /login um. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/* ── Globale Rolle ────────────────────────────────────────────────────────── */

/** Ist der Nutzer Super-Admin (darf alles administrieren)? */
export function isSuperAdmin(user: { roles?: string[] } | null): boolean {
  return Boolean(user?.roles?.includes(SUPERADMIN_ROLE));
}

/** Super-Admin erzwingen (für /admin). */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isSuperAdmin(user)) throw new Error("Kein Zugriff (nur Super-Admin)");
  return user;
}

/** Supporter = globale NUR-LESE-Rolle: Einblick in alle Clubs und deren
    Maschinen (nicht in private Sammlungen), ohne jede Änderung. */
export function isSupporter(user: { roles?: string[] } | null): boolean {
  return Boolean(user?.roles?.includes(SUPPORTER_ROLE));
}

/* ── Club-Rollen ──────────────────────────────────────────────────────────── */

/** Rollen-Key des Nutzers in diesem Club — oder null (= kein Mitglied). */
export async function getClubRole(
  userId: string,
  clubId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ key: roles.key })
    .from(roleAssignments)
    .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
    .where(
      and(
        eq(roleAssignments.userId, userId),
        eq(roleAssignments.clubId, clubId),
      ),
    )
    .limit(1);
  return row?.key ?? null;
}

/** Mitglied = hat irgendeine Rolle in diesem Club. */
export async function isClubMember(userId: string, clubId: string) {
  return (await getClubRole(userId, clubId)) !== null;
}

/** Owner = oberste Club-Rolle (befördert Owner, löscht den Club). */
export async function isClubOwner(userId: string, clubId: string) {
  return (await getClubRole(userId, clubId)) === "owner";
}

/** Manager = Owner ODER Admin (darf Mitglieder/Einladungen verwalten). */
export async function isClubManager(userId: string, clubId: string) {
  const rolle = await getClubRole(userId, clubId);
  return rolle === "owner" || rolle === "admin";
}

/** Club-IDs, in denen der Nutzer Mitglied ist (= club-bezogene Zuweisungen).
    Liegt hier bei den übrigen Mitgliedschafts-Helfern, damit lib/sharing.ts
    sie nutzen kann, ohne db/queries.ts zu importieren — das ergäbe einen
    Import-Zyklus (queries → sharing → queries). */
export async function getUserClubIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ clubId: roleAssignments.clubId })
    .from(roleAssignments)
    .where(
      and(eq(roleAssignments.userId, userId), isNotNull(roleAssignments.clubId)),
    );
  return rows.map((r) => r.clubId).filter((id): id is string => id !== null);
}

/** Anzahl der Owner eines Clubs — für die „mind. 1 Owner"-Invariante. */
export async function countClubOwners(clubId: string) {
  const rows = await db
    .select({ id: roleAssignments.id })
    .from(roleAssignments)
    .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
    .where(and(eq(roleAssignments.clubId, clubId), eq(roles.key, "owner")));
  return rows.length;
}

/**
 * LESE-Zugriff auf eine Maschine: erlaubt, wenn der Nutzer Eigentümer ist,
 * Super-Admin ist, Mitglied des zugeordneten Clubs — ODER Supporter UND die
 * Maschine gehört einem Club (Supporter sehen keine privaten Sammlungen).
 * Wirft sonst — die eine Regel, überall wiederverwendet. Fehler und Reparaturen
 * erben ihre Autorisierung hierüber (via fault.machineId).
 *
 * `darf` trägt die SCHREIB-Berechtigung. Wichtig: Lesen und Schreiben sind
 * getrennt, damit die Nur-Lese-Rolle Supporter nichts verändern kann — vorher
 * gewährte requireMachineAccess implizit auch Schreibrechte.
 */
export async function requireMachineAccess(machineId: string) {
  const user = await requireUser();
  const machine = await db.query.machines.findFirst({
    where: eq(machines.id, machineId),
  });
  if (!machine) notFound();

  const eigentuemer = machine.ownerId === user.id;
  const mitglied =
    machine.clubId !== null && (await isClubMember(user.id, machine.clubId));
  const supporterLesen = isSupporter(user) && machine.clubId !== null;

  const erlaubt =
    isSuperAdmin(user) || eigentuemer || mitglied || supporterLesen;
  if (!erlaubt) {
    throw new Error("Kein Zugriff auf diese Maschine");
  }

  const clubManager =
    machine.clubId !== null && (await isClubManager(user.id, machine.clubId));

  // Schreiben darf, wer Eigentümer, echtes Club-Mitglied oder Super-Admin ist —
  // NICHT ein Supporter (der hat nur über supporterLesen Zugriff).
  const schreibberechtigt = isSuperAdmin(user) || eigentuemer || mitglied;

  return {
    user,
    machine,
    darf: {
      bearbeiten: schreibberechtigt,
      // Löschen nur Eigentümer, Club-Manager oder Super-Admin (= deleteMachine).
      loeschen: isSuperAdmin(user) || eigentuemer || clubManager,
      // Teilen darf, wer auch löschen darf — es gibt Daten nach außen.
      teilen: isSuperAdmin(user) || eigentuemer || clubManager,
    },
  };
}

/** SCHREIB-Zugriff auf eine Maschine erzwingen (anlegen/ändern/löschen von
    Maschine, Fehlern, Reparaturen, Handbuch-Fakten). Lehnt Supporter ab, die
    nur Lesezugriff haben. */
export async function requireMachineWrite(machineId: string) {
  const res = await requireMachineAccess(machineId);
  if (!res.darf.bearbeiten) {
    throw new Error("Nur lesender Zugriff auf diese Maschine");
  }
  return res;
}

/** Lese-Zugriff auf einen Club (für Club-Detailseiten). Super-Admin und
    Supporter dürfen jeden Club lesen. */
export async function requireClubMember(clubId: string) {
  const user = await requireUser();
  if (
    !isSuperAdmin(user) &&
    !isSupporter(user) &&
    !(await isClubMember(user.id, clubId))
  ) {
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
