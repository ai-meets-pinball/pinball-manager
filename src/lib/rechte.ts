import { CLUB_ROLES, KURATOR_ROLE, SUPERADMIN_ROLE, SUPPORTER_ROLE } from "@/lib/validators";

/*
  Die Autorisierungsregeln — rein, ohne Datenbank und ohne Request-Kontext.

  Es gibt bewusst KEIN Row-Level-Security in der Datenbank; die Regeln sollen
  im TypeScript nachlesbar bleiben (PRD §3, §7). Genau deshalb liegen sie
  hier und nicht in lib/session.ts: dort steckt jede Regel hinter `headers()`
  und dem db-Singleton und ist damit nur über einen Browser prüfbar. Als reine
  Funktionen sind sie eine Tabelle im Test — und besser lesbar, was der
  eigentliche Zweck der Entscheidung war.

  lib/session.ts ist der Adapter: er lädt Zeile und Rolle und ruft diese
  Funktionen. Die Begriffe (`darf`, Club, Kurator, Supporter) stehen in
  CONTEXT.md.
*/

export type ClubRolle = (typeof CLUB_ROLES)[number];

/** Wer eine Entscheidung braucht: nur die globalen Rollen zählen hier. */
export type RechteNutzer = { id: string; roles?: string[] };

/* ── Globale Rollen ───────────────────────────────────────────────────────── */

export function isSuperAdmin(user: RechteNutzer | null): boolean {
  return Boolean(user?.roles?.includes(SUPERADMIN_ROLE));
}

/** Supporter = globale NUR-LESE-Rolle: Einblick in Clubs und deren Maschinen
    (nicht in private Sammlungen), ohne jede Änderung. */
export function isSupporter(user: RechteNutzer | null): boolean {
  return Boolean(user?.roles?.includes(SUPPORTER_ROLE));
}

/** Kurator = globale Moderations-Rolle für die Wissensbasis. */
export function isKurator(user: RechteNutzer | null): boolean {
  return Boolean(user?.roles?.includes(KURATOR_ROLE));
}

export function kannKuratieren(user: RechteNutzer | null): boolean {
  return isKurator(user) || isSuperAdmin(user);
}

/* ── Club-Rollen ──────────────────────────────────────────────────────────── */

// CLUB_ROLES ist von stark nach schwach sortiert: owner, admin, member.
const RANG: Record<ClubRolle, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

/** Rang einer Club-Rolle; 0 = keine Rolle (kein Mitglied). */
export function clubRang(rolle: string | null): number {
  return rolle && rolle in RANG ? RANG[rolle as ClubRolle] : 0;
}

/** Hat die Rolle mindestens diesen Rang? Ersetzt verstreute Vergleiche wie
    `rolle === "owner" || rolle === "admin"`. */
export function mindestens(rolle: string | null, minimum: ClubRolle): boolean {
  return clubRang(rolle) >= RANG[minimum];
}

/**
 * Würde das Entfernen bzw. Herabstufen dieser Rolle den letzten Owner kosten?
 * Ein Club ohne Owner wäre nicht mehr verwaltbar.
 */
export function istLetzterOwner(rolle: string | null, ownerAnzahl: number): boolean {
  return rolle === "owner" && ownerAnzahl <= 1;
}

/* ── Maschinen ────────────────────────────────────────────────────────────── */

export type MaschinenRechte = {
  lesen: boolean;
  bearbeiten: boolean;
  loeschen: boolean;
  teilen: boolean;
};

/**
 * Was jemand mit einer Maschine darf.
 *
 * Lesen und Schreiben sind getrennt, damit die Nur-Lese-Rolle Supporter
 * nichts verändern kann. Supporter sehen zudem nur CLUB-Maschinen — private
 * Sammlungen bleiben privat.
 */
export function darfMaschine(
  user: RechteNutzer,
  maschine: { ownerId: string; clubId: string | null },
  clubRolle: string | null,
): MaschinenRechte {
  const superAdmin = isSuperAdmin(user);
  const eigentuemer = maschine.ownerId === user.id;
  const imClub = maschine.clubId !== null;
  const mitglied = imClub && clubRolle !== null;
  const supporterLesen = imClub && isSupporter(user);
  const manager = imClub && mindestens(clubRolle, "admin");

  return {
    lesen: superAdmin || eigentuemer || mitglied || supporterLesen,
    bearbeiten: superAdmin || eigentuemer || mitglied,
    // Löschen und Teilen geben Daten preis bzw. sind endgültig — dafür reicht
    // eine einfache Mitgliedschaft nicht.
    loeschen: superAdmin || eigentuemer || manager,
    teilen: superAdmin || eigentuemer || manager,
  };
}

/* ── Wissen ───────────────────────────────────────────────────────────────── */

export type WissensRechte = {
  /** Ändern, Sichtbarkeit umstellen, Verlauf einsehen — dieselbe Regel. */
  bearbeiten: boolean;
  /** Für alle verbergen bzw. wiederherstellen (nachgelagerte Moderation). */
  kuratieren: boolean;
};

export function darfWissen(
  user: RechteNutzer,
  eintrag: { createdBy: string },
): WissensRechte {
  return {
    bearbeiten: eintrag.createdBy === user.id || isSuperAdmin(user),
    kuratieren: kannKuratieren(user),
  };
}

/* ── Clubs ────────────────────────────────────────────────────────────────── */

export type ClubRechte = {
  lesen: boolean;
  /** Mitglieder und Einladungen verwalten (Owner oder Admin). */
  verwalten: boolean;
  /** Owner-Rolle vergeben oder entziehen, Club löschen — nur Owner. */
  ownerVergeben: boolean;
};

export function darfClub(user: RechteNutzer, rolle: string | null): ClubRechte {
  const superAdmin = isSuperAdmin(user);
  return {
    lesen: superAdmin || isSupporter(user) || rolle !== null,
    verwalten: superAdmin || mindestens(rolle, "admin"),
    ownerVergeben: superAdmin || mindestens(rolle, "owner"),
  };
}
