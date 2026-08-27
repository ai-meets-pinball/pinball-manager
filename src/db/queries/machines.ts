import { randomBytes } from "node:crypto";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  clubs,
  faultImages,
  faults,
  generations,
  machineAusstattung,
  machineBesitzer,
  machineBesitzerZuordnung,
  machineDokumente,
  machineModels,
  machines,
  maintenanceLog,
  roleAssignments,
  termine,
  user,
  userSettings,
} from "@/db/schema";
import { getUserClubIds, isSuperAdmin, type SessionUser } from "@/lib/session";

/*
  Maschinen: Sichtbarkeit, Fehler und die Kennzahlen der Detailseite.
  `sichtbareMaschinenFilter` ist die eine Stelle, an der „darf sehen" als
  SQL-Bedingung formuliert wird — auch die Wartungs-Abfragen ziehen sie.
*/

/** Ein Modell (machine_models) per id — für die Typ-Seite. */
export async function getMachineModel(modelId: string) {
  return db.query.machineModels.findFirst({
    where: eq(machineModels.id, modelId),
  });
}

/** Die Generation eines Modells (oder null) — für die Ebene-Wahl beim Guide. */
export async function getModelGeneration(modelId: string) {
  const [row] = await db
    .select({ id: generations.id, name: generations.name })
    .from(machineModels)
    .innerJoin(generations, eq(generations.id, machineModels.generationId))
    .where(eq(machineModels.id, modelId));
  return row ?? null;
}

/**
 * Alle für den Nutzer sichtbaren Maschinen: eigene ODER aus seinen Clubs.
 * Optionaler Textfilter über Hersteller/Modell.
 */
/**
 * SQL-Bedingung „diese Maschine darf der Nutzer sehen": eigene ODER aus einem
 * seiner Clubs. Die eine Stelle, an der Maschinen-Sichtbarkeit als Filter
 * formuliert wird — von der Maschinenliste und von den Mengen-Abfragen
 * (Dashboard-Badges) gemeinsam benutzt, damit letztere sich nicht darauf
 * verlassen müssen, dass der Aufrufer schon gefiltert hat.
 */
export async function sichtbareMaschinenFilter(
  userId: string,
): Promise<SQL | undefined> {
  const clubIds = await getUserClubIds(userId);
  return or(
    eq(machines.ownerId, userId),
    clubIds.length > 0 ? inArray(machines.clubId, clubIds) : undefined,
  );
}

async function maschinenFuer(userId: string, suche?: string) {
  const filters: (SQL | undefined)[] = [await sichtbareMaschinenFilter(userId)];
  if (suche && suche.trim()) {
    const q = `%${suche.trim()}%`;
    filters.push(or(ilike(machines.hersteller, q), ilike(machines.modell, q)));
  }

  return db.query.machines.findMany({
    where: and(...filters),
    with: { club: { columns: { name: true } } },
    orderBy: [desc(machines.createdAt)],
  });
}

/*
  Besitzer-Katalog für den Picker im Maschinen-Formular: die eigenen privaten
  Einträge (clubId NULL) plus die Einträge aller Clubs, in denen der Nutzer
  Mitglied ist. Der Client filtert je nach gewähltem Club auf die passende
  Teilmenge (Club-Eintrag ↔ Club-Maschine, privater Eintrag ↔ private Maschine).
*/
export async function getBesitzerKatalog(currentUser: SessionUser) {
  const clubIds = await getUserClubIds(currentUser.id);
  const bedingungen: SQL[] = [
    and(
      isNull(machineBesitzer.clubId),
      eq(machineBesitzer.createdBy, currentUser.id),
    )!,
  ];
  if (clubIds.length > 0) {
    bedingungen.push(inArray(machineBesitzer.clubId, clubIds));
  }
  return db
    .select({
      id: machineBesitzer.id,
      name: machineBesitzer.name,
      email: machineBesitzer.email,
      clubId: machineBesitzer.clubId,
      userId: machineBesitzer.userId,
    })
    .from(machineBesitzer)
    .where(or(...bedingungen))
    .orderBy(machineBesitzer.name);
}

/* ── Termine (datierte Ereignisse) ────────────────────────────────────────── */

/** Offene Termine EINES Geräts (erledigtAm null), nächster zuerst. */
export async function getMachineTermine(machineId: string) {
  return db
    .select({
      id: termine.id,
      titel: termine.titel,
      notiz: termine.notiz,
      datum: termine.datum,
      erinnerungTageVorher: termine.erinnerungTageVorher,
      wiederholenMonate: termine.wiederholenMonate,
    })
    .from(termine)
    .where(and(eq(termine.machineId, machineId), isNull(termine.erledigtAm)))
    .orderBy(termine.datum);
}

/** Offene Termine über ALLE sichtbaren Geräte (globale Agenda / Dashboard),
    nächster zuerst. */
export async function getKommendeTermine(
  currentUser: SessionUser,
  limit?: number,
) {
  const sichtbar = await sichtbareMaschinenFilter(currentUser.id);
  const q = db
    .select({
      id: termine.id,
      machineId: termine.machineId,
      titel: termine.titel,
      datum: termine.datum,
      wiederholenMonate: termine.wiederholenMonate,
      hersteller: machines.hersteller,
      modell: machines.modell,
    })
    .from(termine)
    .innerJoin(machines, eq(machines.id, termine.machineId))
    .where(and(isNull(termine.erledigtAm), sichtbar))
    .orderBy(termine.datum);
  return limit ? q.limit(limit) : q;
}

/* ── Dokumente (Links / Notizen / Dateien je Gerät) ───────────────────────── */

/** Alle Dokumente EINES Geräts (ältestes zuerst — Reihenfolge des Anlegens). */
export async function getMachineDokumente(machineId: string) {
  return db
    .select({
      id: machineDokumente.id,
      typ: machineDokumente.typ,
      titel: machineDokumente.titel,
      notiz: machineDokumente.notiz,
      url: machineDokumente.url,
      dateiname: machineDokumente.dateiname,
      createdAt: machineDokumente.createdAt,
    })
    .from(machineDokumente)
    .where(eq(machineDokumente.machineId, machineId))
    .orderBy(machineDokumente.createdAt);
}

/** Maschine über ihren kurzen QR-Melde-Code (öffentliche Melde-Seite /m) —
    bewusst nur die Felder, die die Seite zeigt bzw. für die Zugriffs-Weiche
    braucht. */
export async function getMachineByQrToken(token: string) {
  return db.query.machines.findFirst({
    where: eq(machines.qrToken, token),
    columns: {
      id: true,
      hersteller: true,
      modell: true,
      baujahr: true,
      fotoUrl: true,
      ownerId: true,
      clubId: true,
    },
  });
}

/* ── Sammlung (Club oder private Sammlung einer Person) über den Sammel-QR ──── */

export type SammlungMaschine = {
  id: string;
  hersteller: string;
  modell: string;
  baujahr: number | null;
  fotoUrl: string | null;
  status: string;
};

export type Sammlung = {
  typ: "club" | "user";
  id: string; // clubId bzw. userId
  name: string;
  logoUrl: string | null;
  maschinen: SammlungMaschine[];
};

async function sammlungMaschinen(where: SQL): Promise<SammlungMaschine[]> {
  return db
    .select({
      id: machines.id,
      hersteller: machines.hersteller,
      modell: machines.modell,
      baujahr: machines.baujahr,
      fotoUrl: machines.fotoUrl,
      status: machines.status,
    })
    .from(machines)
    .where(where)
    .orderBy(machines.hersteller, machines.modell);
}

/** Sammlung über ihren öffentlichen Sammel-QR-Token auflösen (erst Club, dann
    private Nutzer-Sammlung). Öffentlich (kein Gate) — der Token IST die Hürde,
    genau wie bei getMachineByQrToken. */
export async function getSammlungByToken(
  code: string,
): Promise<Sammlung | null> {
  const club = await db.query.clubs.findFirst({
    where: eq(clubs.qrToken, code),
    columns: { id: true, name: true, logoUrl: true },
  });
  if (club) {
    return {
      typ: "club",
      id: club.id,
      name: club.name,
      logoUrl: club.logoUrl,
      maschinen: await sammlungMaschinen(eq(machines.clubId, club.id)),
    };
  }

  const settings = await db.query.userSettings.findFirst({
    where: eq(userSettings.qrToken, code),
    columns: { userId: true, logoUrl: true },
  });
  if (settings) {
    const owner = await db.query.user.findFirst({
      where: eq(user.id, settings.userId),
      columns: { name: true },
    });
    return {
      typ: "user",
      id: settings.userId,
      name: owner?.name ?? "Private Sammlung",
      logoUrl: settings.logoUrl,
      maschinen: await sammlungMaschinen(
        and(eq(machines.ownerId, settings.userId), isNull(machines.clubId))!,
      ),
    };
  }
  return null;
}

/** Sammel-QR-Token der privaten Sammlung sicherstellen (bei Erstaufruf erzeugen).
    Idempotent + race-fest: ein bereits gesetzter Token bleibt erhalten. */
export async function ensureUserSammlungToken(userId: string): Promise<string> {
  const row = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
    columns: { qrToken: true },
  });
  if (row?.qrToken) return row.qrToken;

  const token = randomBytes(6).toString("hex"); // 12 Hex, wie machines.qr_token
  await db
    .insert(userSettings)
    .values({ userId, qrToken: token })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { qrToken: sql`coalesce(${userSettings.qrToken}, ${token})` },
    });
  const nachher = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
    columns: { qrToken: true },
  });
  return nachher?.qrToken ?? token;
}

/** Die eingetragenen Besitzer EINER Maschine (n:m), alphabetisch. */
export async function getMachineBesitzer(machineId: string) {
  return db
    .select({
      id: machineBesitzer.id,
      name: machineBesitzer.name,
      email: machineBesitzer.email,
      userId: machineBesitzer.userId,
    })
    .from(machineBesitzerZuordnung)
    .innerJoin(
      machineBesitzer,
      eq(machineBesitzer.id, machineBesitzerZuordnung.besitzerId),
    )
    .where(eq(machineBesitzerZuordnung.machineId, machineId))
    .orderBy(machineBesitzer.name);
}

/** Die Ausstattung/Add-ons EINER Maschine (1:n), in Anlage-Reihenfolge. */
export async function getMachineAusstattung(machineId: string) {
  return db
    .select({
      id: machineAusstattung.id,
      name: machineAusstattung.name,
      notiz: machineAusstattung.notiz,
    })
    .from(machineAusstattung)
    .where(eq(machineAusstattung.machineId, machineId))
    .orderBy(machineAusstattung.createdAt);
}

/*
  Plattform-Nutzer, die als Besitzer wählbar sind: die Mitglieder der eigenen
  Clubs (der Besitzer ist oft schon Nutzer). Bewusst KEIN globales Nutzer-
  Verzeichnis — sichtbar ist nur, wen man ohnehin kennt (Club-Mitglieder;
  für private Maschinen bietet das Formular nur den Nutzer selbst an).
*/
export async function getBesitzerNutzerKatalog(currentUser: SessionUser) {
  const clubIds = await getUserClubIds(currentUser.id);
  if (clubIds.length === 0) return [];
  return db
    .select({
      userId: roleAssignments.userId,
      name: user.name,
      clubId: roleAssignments.clubId,
    })
    .from(roleAssignments)
    .innerJoin(user, eq(user.id, roleAssignments.userId))
    .where(inArray(roleAssignments.clubId, clubIds))
    .orderBy(user.name);
}

/** Die eigenen sichtbaren Maschinen. Nimmt den Nutzer, nicht eine ID — so
    lässt sich hier keine fremde ID hineinreichen. */
export async function getMeineMaschinen(
  currentUser: SessionUser,
  suche?: string,
) {
  return maschinenFuer(currentUser.id, suche);
}

/**
 * Die Maschinen eines FREMDEN Nutzers (Admin-Sichtbarkeitsansicht). Bewusst
 * eine eigene Funktion mit eigenem Namen und eigener Prüfung: der Blick in
 * fremde Sammlungen soll im Code als Sonderfall sichtbar sein und nicht als
 * derselbe Aufruf mit einem anderen Argument.
 */
export async function getMaschinenVonNutzer(
  currentUser: SessionUser,
  userId: string,
  suche?: string,
) {
  if (!isSuperAdmin(currentUser)) {
    throw new Error("Nur Super-Admins dürfen fremde Sammlungen einsehen");
  }
  return maschinenFuer(userId, suche);
}

/** Dashboard: offene Fehler (Status ≠ behoben) über die sichtbaren Maschinen. */
export async function getOpenFaultsForMachines(
  currentUser: SessionUser,
  machineIds: string[],
) {
  if (machineIds.length === 0) return [];
  const sichtbar = await sichtbareMaschinenFilter(currentUser.id);
  return db
    .select({
      id: faults.id,
      machineId: faults.machineId,
      beschreibung: faults.beschreibung,
      prioritaet: faults.prioritaet,
      status: faults.status,
      quelle: faults.quelle,
      datum: faults.datum,
      hersteller: machines.hersteller,
      modell: machines.modell,
    })
    .from(faults)
    .innerJoin(machines, eq(machines.id, faults.machineId))
    .where(
      and(
        inArray(faults.machineId, machineIds),
        sichtbar,
        ne(faults.status, "behoben"),
      ),
    )
    .orderBy(desc(faults.datum));
}

/** Fehler EINER Maschine mit Melder-Name (gemeldetVon → user.name). Speist die
    Fehler-Vorschau auf der Übersicht (nurOffen + limit) UND die volle Liste. */
export async function getMachineFaults(
  machineId: string,
  opts: { nurOffen?: boolean; limit?: number } = {},
) {
  const q = db
    .select({
      id: faults.id,
      beschreibung: faults.beschreibung,
      kategorie: faults.kategorie,
      prioritaet: faults.prioritaet,
      status: faults.status,
      quelle: faults.quelle,
      datum: faults.datum,
      // Konto-Name — oder der Gast-Name aus der QR-Meldung, gekennzeichnet.
      melderName: sql<
        string | null
      >`coalesce(${user.name}, ${faults.gemeldetVonName} || ' (Gast)')`,
      // Angehängte Fotos (URLs) — eine Abfrage, korrelierter array_agg.
      bilder: sql<
        string[]
      >`(select coalesce(array_agg(${faultImages.url} order by ${faultImages.createdAt}), '{}') from ${faultImages} where ${faultImages.faultId} = ${faults.id})`,
    })
    .from(faults)
    .leftJoin(user, eq(user.id, faults.gemeldetVon))
    .where(
      opts.nurOffen
        ? and(eq(faults.machineId, machineId), ne(faults.status, "behoben"))
        : eq(faults.machineId, machineId),
    )
    .orderBy(desc(faults.datum));
  return opts.limit ? q.limit(opts.limit) : q;
}

/** Datum der jüngsten erledigten Wartung dieser Maschine (oder null). */
export async function getLetzteWartung(
  machineId: string,
): Promise<Date | null> {
  const [row] = await db
    .select({ datum: maintenanceLog.datum })
    .from(maintenanceLog)
    .where(eq(maintenanceLog.machineId, machineId))
    .orderBy(desc(maintenanceLog.datum))
    .limit(1);
  return row?.datum ?? null;
}

/** Neue Fehler seit gestern 00:00 (lokal) — gesamt und davon kritisch. Für die
    „↑ X seit gestern"-Deltas auf den Fehler-Kacheln. */
export async function getNeueFehlerSeitGestern(
  machineId: string,
): Promise<{ gesamt: number; kritisch: number }> {
  const jetzt = new Date();
  const grenze = new Date(
    jetzt.getFullYear(),
    jetzt.getMonth(),
    jetzt.getDate() - 1,
  );
  const [row] = await db
    .select({
      gesamt: count(),
      kritisch: sql<number>`count(*) filter (where ${faults.prioritaet} = 'kritisch')::int`,
    })
    .from(faults)
    .where(and(eq(faults.machineId, machineId), gte(faults.datum, grenze)));
  return {
    gesamt: Number(row?.gesamt ?? 0),
    kritisch: Number(row?.kritisch ?? 0),
  };
}
