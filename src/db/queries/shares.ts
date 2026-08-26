import {
  and,
  desc,
  eq,
  inArray,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  clubSettings,
  faults,
  machines,
  repairs,
  shareTargets,
  shares,
  user,
  userSettings,
} from "@/db/schema";
import {
  getUserClubIds,
  isSuperAdmin,
  type SessionUser,
} from "@/lib/session";
import { SHARE_DEFAULTS, type ShareDefaults } from "@/lib/share-defaults";

/*
  Freigaben: wer welche geteilten Reparaturen sehen darf, inklusive der
  serverseitigen Feldprojektion (Kosten/Name verlassen den Server nicht).
*/

/** SQL-Bedingung: welche Freigaben darf dieser Nutzer sehen?
    `undefined` = keine Einschränkung (Super-Admin sieht alles). */
async function shareVisibilityFilter(
  currentUser: SessionUser,
): Promise<SQL | undefined> {
  if (isSuperAdmin(currentUser)) return undefined;

  const clubIds = await getUserClubIds(currentUser.id);

  const clubZiele = db
    .select({ id: shareTargets.shareId })
    .from(shareTargets)
    .where(clubIds.length > 0 ? inArray(shareTargets.clubId, clubIds) : sql`false`);

  const nutzerZiele = db
    .select({ id: shareTargets.shareId })
    .from(shareTargets)
    .where(eq(shareTargets.userId, currentUser.id));

  return or(
    eq(shares.ownerId, currentUser.id), // eigene Freigaben immer
    eq(shares.scope, "platform"),
    and(eq(shares.scope, "club"), inArray(shares.id, clubZiele)),
    and(eq(shares.scope, "users"), inArray(shares.id, nutzerZiele)),
  );
}

/**
 * Geteilte Reparaturen zu einem Modell — die wachsende Reparaturdatenbank.
 *
 * Die Feldprojektion passiert HIER, serverseitig: Kosten/Aufwand und der Name
 * des Urhebers werden gar nicht erst geladen bzw. auf null gesetzt, wenn die
 * Freigabe sie nicht freigibt. Ein Ausblenden erst im JSX würde die Werte an
 * den Client ausliefern.
 */
export async function getSharedRepairsForModel(
  currentUser: SessionUser,
  modelId: string,
  exkludiereMachineId?: string,
) {
  const sichtbar = await shareVisibilityFilter(currentUser);

  const zeilen = await db
    .select({
      shareId: shares.id,
      anonym: shares.anonym,
      zeigeKosten: shares.zeigeKosten,
      ownerName: user.name,
      repairId: repairs.id,
      datum: repairs.datum,
      status: repairs.status,
      diagnose: repairs.diagnose,
      massnahme: repairs.massnahme,
      teile: repairs.teile,
      kosten: repairs.kosten,
      zeit: repairs.zeit,
      faultBeschreibung: faults.beschreibung,
      faultKategorie: faults.kategorie,
    })
    .from(shares)
    .innerJoin(repairs, eq(repairs.id, shares.artefaktId))
    .innerJoin(machines, eq(machines.id, repairs.machineId))
    .innerJoin(user, eq(user.id, shares.ownerId))
    .leftJoin(faults, eq(faults.id, repairs.faultId))
    .where(
      and(
        eq(shares.artefaktTyp, "repair"),
        eq(shares.modelId, modelId),
        exkludiereMachineId
          ? ne(repairs.machineId, exkludiereMachineId)
          : undefined,
        sichtbar,
      ),
    )
    .orderBy(desc(repairs.datum));

  // Projektion anwenden — verborgene Felder verlassen den Server nicht.
  return zeilen.map((z) => ({
    shareId: z.shareId,
    repairId: z.repairId,
    datum: z.datum,
    status: z.status,
    diagnose: z.diagnose,
    massnahme: z.massnahme,
    teile: z.teile,
    faultBeschreibung: z.faultBeschreibung,
    faultKategorie: z.faultKategorie,
    kosten: z.zeigeKosten ? z.kosten : null,
    zeit: z.zeigeKosten ? z.zeit : null,
    herkunft: z.anonym ? null : z.ownerName,
  }));
}

/** Freigaben der Reparaturen EINER Maschine (für die eigenen Teilen-Schalter). */
export async function getRepairShares(machineId: string) {
  const zeilen = await db
    .select({
      artefaktId: shares.artefaktId,
      scope: shares.scope,
      anonym: shares.anonym,
      zeigeKosten: shares.zeigeKosten,
    })
    .from(shares)
    .innerJoin(repairs, eq(repairs.id, shares.artefaktId))
    .where(
      and(eq(shares.artefaktTyp, "repair"), eq(repairs.machineId, machineId)),
    );
  return new Map(zeilen.map((z) => [z.artefaktId, z]));
}

/**
 * Freigabe-Voreinstellungen für eine Maschine.
 * Club-Maschine → Club-Einstellungen, sonst die des Eigentümers; fehlt die
 * Zeile, gilt der Standard aus dem Code.
 */
export async function getShareDefaults(machine: {
  ownerId: string;
  clubId: string | null;
}): Promise<ShareDefaults> {
  try {
    const row = machine.clubId
      ? await db.query.clubSettings.findFirst({
          where: eq(clubSettings.clubId, machine.clubId),
        })
      : await db.query.userSettings.findFirst({
          where: eq(userSettings.userId, machine.ownerId),
        });

    if (!row) return SHARE_DEFAULTS;
    return {
      defaultScope: row.defaultScope as ShareDefaults["defaultScope"],
      defaultAnonym: row.defaultAnonym,
      defaultZeigeKosten: row.defaultZeigeKosten,
      autoShareFacts: row.autoShareFacts,
      autoShareRepairs: row.autoShareRepairs,
    };
  } catch (e) {
    // Schema-Drift-fest (siehe getSettingsFor): Standard statt 500.
    console.error("[shares] Voreinstellungen nicht ladbar, nutze Standard:", e);
    return SHARE_DEFAULTS;
  }
}
