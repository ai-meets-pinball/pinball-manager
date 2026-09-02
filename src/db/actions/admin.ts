"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { clubs, roleAssignments, roles, user } from "@/db/schema";
import { loeschBlocker, loescheNutzer } from "@/db/konto-loeschung";
import { istLetzterOwner, rolleEntfernenGesperrt, EIGENE_GLOBALE_ROLLE_GESPERRT } from "@/lib/rechte";
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
import { loescheClub } from "@/db/club-loeschung";

/** Vergebbare globale Rollen (per /admin). Founder o. Ä. ließen sich hier ergänzen. */
const VERGEBBARE_GLOBALE_ROLLEN = [
  SUPERADMIN_ROLE,
  KURATOR_ROLE,
] as const;

/* Wie viele Super-Admins gibt es? (Für die „letzter bleibt"-Regel.) */
async function countSuperAdmins(): Promise<number> {
  const rows = await db
    .select({ id: roleAssignments.id })
    .from(roleAssignments)
    .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
    .where(and(eq(roles.key, SUPERADMIN_ROLE), isNull(roleAssignments.clubId)));
  return rows.length;
}

/*
  Beide Actions bedienen EIN Formular für BEIDE Achsen: `scope` = "global"
  (clubId leer) oder "club" (clubId Pflicht — eine Club-Rolle existiert nie ohne
  Club). Sie geben FormState zurück statt zu werfen: eine abgelehnte Rollen-
  änderung ist eine Rückmeldung im Dialog, keine Fehlerseite. Die Sperr-Regeln
  stehen in lib/rechte.ts (rolleEntfernenGesperrt, istLetzterOwner) und gelten
  im UI (Button deaktiviert) genauso wie hier (Rennen zweier Admins).
*/

/** Eine Rolle vergeben oder (Club) ändern — nur Super-Admin. */
export async function setUserRole(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireSuperAdmin();

  const userId = String(formData.get("userId"));
  const scope = String(formData.get("scope"));
  const clubId = String(formData.get("clubId") ?? "");
  const rolle = String(formData.get("rolle"));

  if (scope === "global") {
    if (!VERGEBBARE_GLOBALE_ROLLEN.includes(rolle as never)) {
      return { error: "Unbekannte globale Rolle" };
    }
    if (userId === me.id) {
      return { error: EIGENE_GLOBALE_ROLLE_GESPERRT };
    }
    await db
      .insert(roleAssignments)
      .values({ userId, roleId: await roleIdByKey(rolle) })
      .onConflictDoNothing();
    revalidatePath("/admin");
    return { ok: true };
  }

  if (scope !== "club") return { error: "Unbekannter Geltungsbereich" };
  if (!CLUB_ROLES.includes(rolle as never)) {
    return { error: "Unbekannte Club-Rolle" };
  }
  if (!clubId) return { error: "Bitte einen Club wählen" };
  const club = await db.query.clubs.findFirst({ where: eq(clubs.id, clubId) });
  if (!club) return { error: "Club nicht gefunden" };

  const aktuelle = await getClubRole(userId, clubId);
  if (aktuelle === rolle) return { ok: true };

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
  return { ok: true };
}

/** Eine Rolle entziehen — nur Super-Admin. Sperren: siehe rolleEntfernenGesperrt. */
export async function removeUserRole(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireSuperAdmin();

  const userId = String(formData.get("userId"));
  const scope = String(formData.get("scope"));
  const clubId = String(formData.get("clubId") ?? "");
  const rolle = String(formData.get("rolle"));

  if (scope === "global") {
    const grund = rolleEntfernenGesperrt({
      scope: "global",
      rolle,
      superAdminAnzahl: await countSuperAdmins(),
      istSelbst: userId === me.id,
    });
    if (grund) return { error: grund };

    await db
      .delete(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, userId),
          eq(roleAssignments.roleId, await roleIdByKey(rolle)),
          isNull(roleAssignments.clubId),
        ),
      );
    revalidatePath("/admin");
    return { ok: true };
  }

  if (scope !== "club") return { error: "Unbekannter Geltungsbereich" };
  const aktuelle = await getClubRole(userId, clubId);
  if (!aktuelle) return { ok: true };

  const grund = rolleEntfernenGesperrt({
    scope: "club",
    rolle: aktuelle,
    ownerAnzahl: await countClubOwners(clubId),
  });
  if (grund) return { error: grund };

  await db
    .delete(roleAssignments)
    .where(
      and(
        eq(roleAssignments.userId, userId),
        eq(roleAssignments.clubId, clubId),
      ),
    );

  revalidatePath("/admin");
  return { ok: true };
}

/*
  Ein fremdes Konto löschen (nur Super-Admin). Derselbe Weg wie der Self-Service
  (db/konto-loeschung.ts) — mit dem handelnden Admin als Übertragungsziel für
  erstellte/geteilte Inhalte. Das eigene Konto löscht man unter „Konto".
*/
export async function deleteUserByAdmin(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireSuperAdmin();
  const userId = String(formData.get("userId"));
  if (userId === me.id) {
    return { error: "Das eigene Konto löschst du unter „Konto“." };
  }
  const ziel = await db.query.user.findFirst({ where: eq(user.id, userId) });
  if (!ziel) return { error: "Nutzer nicht gefunden" };

  const blocker = await loeschBlocker(userId, me.id);
  if (blocker?.art === "alleinOwner") {
    return {
      error: `${ziel.name} ist alleiniger Owner von: ${blocker.clubs.join(
        ", ",
      )}. Übertrage zuerst die Ownerschaft (Rolle ändern) oder lösche diese Clubs.`,
    };
  }

  await loescheNutzer(userId, me.id);
  revalidatePath("/admin");
  return { ok: true };
}

/** Club löschen aus der Admin-Liste — bleibt auf /admin/clubs statt nach /clubs zu springen. */
export async function deleteClubByAdmin(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSuperAdmin();
  const clubId = String(formData.get("clubId"));
  const club = await db.query.clubs.findFirst({ where: eq(clubs.id, clubId) });
  if (!club) return { error: "Club nicht gefunden" };
  await loescheClub(clubId);
  revalidatePath("/admin/clubs");
  return { ok: true };
}

/** Rollen-Katalog (für die Anzeige im Admin-Bereich). */
export async function listRoles() {
  return db.select().from(roles).orderBy(roles.scope, roles.rang);
}
