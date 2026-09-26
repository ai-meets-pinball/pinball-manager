import { and, count, eq, gte, isNotNull, max, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  clubs,
  faults,
  feedback,
  kiAufrufe,
  knowledge,
  loginLog,
  machines,
  nutzungTage,
  repairs,
  roleAssignments,
  roles,
  session,
  user,
} from "@/db/schema";
import { heuteUtc } from "@/lib/nutzung";

/*
  Nutzungsübersicht (/admin/nutzung, nur Super-Admins — Guard im admin/layout).
  Drei Sichten: je Nutzer, je Club, und ein chronologischer Ereignis-Feed.
  Fast alles wird aus den Fachtabellen ABGELEITET (Zeitstempel + Nutzerbezug
  gibt es dort längst); nur Anmeldungen (login_log) und aktive Tage
  (nutzung_tage) sind eigens protokolliert.

  Zähler laufen als mehrere kleine GROUP-BY-Abfragen (Muster
  getDueMaintenanceCountByMachine), NACHEINANDER, und werden im Code zu Zeilen
  gemischt — lesbarer als eine zehnfach korrelierte Subquery. `grenze` ist die
  untere Zeitgrenze (null = alles).
*/

type Zaehler = Map<string, number>;

function alsZaehler(rows: { k: string | null; n: number | string }[]): Zaehler {
  const m = new Map<string, number>();
  for (const r of rows) if (r.k) m.set(r.k, Number(r.n));
  return m;
}

/** Aggregat-Ergebnisse kommen je nach Treiber als Date oder String. */
function alsDatum(v: unknown): Date | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function spaetester(...daten: (Date | null)[]): Date | null {
  return daten.reduce<Date | null>(
    (best, d) => (d && (!best || d > best) ? d : best),
    null,
  );
}

const ab = (spalte: Parameters<typeof gte>[0], grenze: Date | null) =>
  grenze ? gte(spalte, grenze) : undefined;

/* ── Je Nutzer ─────────────────────────────────────────────────────────────── */

export type NutzerZeile = {
  id: string;
  name: string;
  email: string;
  erstelltAm: Date;
  globaleRollen: string[];
  clubs: { name: string; rolle: string }[];
  /** Bestand (kein Zeitraum). */
  maschinen: number;
  fehler: number;
  reparaturen: number;
  wissen: number;
  feedback: number;
  kiAufrufe: number;
  logins: number;
  aktiveTage: number;
  zuletztGesehen: Date | null;
};

export async function getNutzungNutzer(grenze: Date | null): Promise<NutzerZeile[]> {
  const nutzer = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      erstelltAm: user.createdAt,
    })
    .from(user)
    .orderBy(user.name);

  const zuweisungen = await db
    .select({
      userId: roleAssignments.userId,
      key: roles.key,
      clubName: clubs.name,
    })
    .from(roleAssignments)
    .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
    .leftJoin(clubs, eq(clubs.id, roleAssignments.clubId));

  // NACHEINANDER, nicht parallel: elf gleichzeitige Abfragen erschöpfen den
  // postgres-js-Pool (10) hinter dem Supabase-Pooler und hängen dann dauerhaft
  // (2026-09-26 live beobachtet: /admin/nutzung lief in den Timeout). Elf kurze
  // Abfragen in Folge brauchen unter einer halben Sekunde.
  const maschinen = await db
    .select({ k: machines.ownerId, n: count() })
    .from(machines)
    .groupBy(machines.ownerId);
  const fehler = await db
    .select({ k: faults.gemeldetVon, n: count() })
    .from(faults)
    .where(and(isNotNull(faults.gemeldetVon), ab(faults.datum, grenze)))
    .groupBy(faults.gemeldetVon);
  // Reparaturen tragen keinen Nutzer — sie zählen beim Eigentümer der Maschine.
  const reparaturen = await db
    .select({ k: machines.ownerId, n: count() })
    .from(repairs)
    .innerJoin(machines, eq(machines.id, repairs.machineId))
    .where(ab(repairs.datum, grenze))
    .groupBy(machines.ownerId);
  const wissen = await db
    .select({ k: knowledge.createdBy, n: count() })
    .from(knowledge)
    .where(ab(knowledge.createdAt, grenze))
    .groupBy(knowledge.createdBy);
  const meldungen = await db
    .select({ k: feedback.createdBy, n: count() })
    .from(feedback)
    .where(ab(feedback.createdAt, grenze))
    .groupBy(feedback.createdBy);
  const ki = await db
    .select({ k: kiAufrufe.userId, n: count() })
    .from(kiAufrufe)
    .where(ab(kiAufrufe.createdAt, grenze))
    .groupBy(kiAufrufe.userId);
  const logins = await db
    .select({ k: loginLog.userId, n: count() })
    .from(loginLog)
    .where(ab(loginLog.zeitpunkt, grenze))
    .groupBy(loginLog.userId);
  const tage = await db
    .select({ k: nutzungTage.userId, n: count() })
    .from(nutzungTage)
    .where(grenze ? gte(nutzungTage.tag, heuteUtc(grenze)) : undefined)
    .groupBy(nutzungTage.userId);
  // „Zuletzt gesehen": das Späteste aus Session-Aktualisierung (Better Auth,
  // ±1 Tag), letztem aktiven Tag und letzter Anmeldung.
  const gesehenSession = await db
    .select({ k: session.userId, m: max(session.updatedAt) })
    .from(session)
    .groupBy(session.userId);
  const gesehenTag = await db
    .select({ k: nutzungTage.userId, m: max(nutzungTage.tag) })
    .from(nutzungTage)
    .groupBy(nutzungTage.userId);
  const gesehenLogin = await db
    .select({ k: loginLog.userId, m: max(loginLog.zeitpunkt) })
    .from(loginLog)
    .groupBy(loginLog.userId);

  const rollen = new Map<
    string,
    { global: string[]; clubs: { name: string; rolle: string }[] }
  >();
  for (const z of zuweisungen) {
    const e = rollen.get(z.userId) ?? { global: [], clubs: [] };
    if (z.clubName) e.clubs.push({ name: z.clubName, rolle: z.key });
    else e.global.push(z.key);
    rollen.set(z.userId, e);
  }
  const z = {
    maschinen: alsZaehler(maschinen),
    fehler: alsZaehler(fehler),
    reparaturen: alsZaehler(reparaturen),
    wissen: alsZaehler(wissen),
    feedback: alsZaehler(meldungen),
    ki: alsZaehler(ki),
    logins: alsZaehler(logins),
    tage: alsZaehler(tage),
  };
  const gesehen = new Map<string, Date | null>();
  for (const r of gesehenSession) gesehen.set(r.k, alsDatum(r.m));
  for (const r of gesehenLogin)
    gesehen.set(r.k, spaetester(gesehen.get(r.k) ?? null, alsDatum(r.m)));
  for (const r of gesehenTag)
    gesehen.set(
      r.k,
      spaetester(gesehen.get(r.k) ?? null, alsDatum(r.m ? `${r.m}T00:00:00Z` : null)),
    );

  return nutzer.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    erstelltAm: u.erstelltAm,
    globaleRollen: rollen.get(u.id)?.global ?? [],
    clubs: rollen.get(u.id)?.clubs ?? [],
    maschinen: z.maschinen.get(u.id) ?? 0,
    fehler: z.fehler.get(u.id) ?? 0,
    reparaturen: z.reparaturen.get(u.id) ?? 0,
    wissen: z.wissen.get(u.id) ?? 0,
    feedback: z.feedback.get(u.id) ?? 0,
    kiAufrufe: z.ki.get(u.id) ?? 0,
    logins: z.logins.get(u.id) ?? 0,
    aktiveTage: z.tage.get(u.id) ?? 0,
    zuletztGesehen: gesehen.get(u.id) ?? null,
  }));
}

/* ── Je Club ───────────────────────────────────────────────────────────────── */

export type ClubZeile = {
  id: string;
  name: string;
  mitglieder: number;
  maschinen: number;
  fehler: number;
  reparaturen: number;
  letzteAktivitaet: Date | null;
};

export async function getNutzungClubs(grenze: Date | null): Promise<ClubZeile[]> {
  const liste = await db
    .select({ id: clubs.id, name: clubs.name })
    .from(clubs)
    .orderBy(clubs.name);

  // Nacheinander — siehe getNutzungNutzer (Pool-Erschöpfung).
  const mitglieder = await db
    .select({ k: roleAssignments.clubId, n: count() })
    .from(roleAssignments)
    .where(isNotNull(roleAssignments.clubId))
    .groupBy(roleAssignments.clubId);
  const maschinen = await db
    .select({ k: machines.clubId, n: count() })
    .from(machines)
    .where(isNotNull(machines.clubId))
    .groupBy(machines.clubId);
  const fehler = await db
    .select({ k: machines.clubId, n: count() })
    .from(faults)
    .innerJoin(machines, eq(machines.id, faults.machineId))
    .where(and(isNotNull(machines.clubId), ab(faults.datum, grenze)))
    .groupBy(machines.clubId);
  const reparaturen = await db
    .select({ k: machines.clubId, n: count() })
    .from(repairs)
    .innerJoin(machines, eq(machines.id, repairs.machineId))
    .where(and(isNotNull(machines.clubId), ab(repairs.datum, grenze)))
    .groupBy(machines.clubId);
  const letzteFehler = await db
    .select({ k: machines.clubId, m: max(faults.datum) })
    .from(faults)
    .innerJoin(machines, eq(machines.id, faults.machineId))
    .where(isNotNull(machines.clubId))
    .groupBy(machines.clubId);
  const letzteReparatur = await db
    .select({ k: machines.clubId, m: max(repairs.datum) })
    .from(repairs)
    .innerJoin(machines, eq(machines.id, repairs.machineId))
    .where(isNotNull(machines.clubId))
    .groupBy(machines.clubId);
  const letzteMaschine = await db
    .select({ k: machines.clubId, m: max(machines.createdAt) })
    .from(machines)
    .where(isNotNull(machines.clubId))
    .groupBy(machines.clubId);

  const zM = alsZaehler(mitglieder);
  const zMa = alsZaehler(maschinen);
  const zF = alsZaehler(fehler);
  const zR = alsZaehler(reparaturen);
  const letzte = new Map<string, Date | null>();
  for (const rows of [letzteFehler, letzteReparatur, letzteMaschine])
    for (const r of rows)
      if (r.k) letzte.set(r.k, spaetester(letzte.get(r.k) ?? null, alsDatum(r.m)));

  return liste.map((c) => ({
    id: c.id,
    name: c.name,
    mitglieder: zM.get(c.id) ?? 0,
    maschinen: zMa.get(c.id) ?? 0,
    fehler: zF.get(c.id) ?? 0,
    reparaturen: zR.get(c.id) ?? 0,
    letzteAktivitaet: letzte.get(c.id) ?? null,
  }));
}

/* ── Ereignis-Feed ─────────────────────────────────────────────────────────── */

/** Ereignisarten des Feeds — Schlüssel = Wert der Spalte `art` im UNION. */
export const AKTIVITAET_ARTEN = {
  anmeldung: "Anmeldung",
  maschine: "Maschine angelegt",
  fehler: "Fehler gemeldet",
  reparatur: "Reparatur",
  wartung: "Wartung erledigt",
  wissen: "Wissen",
  feedback: "Feedback",
  ki: "KI-Aufruf",
  einladung: "Einladung",
  termin: "Termin angelegt",
} as const;
export type AktivitaetArt = keyof typeof AKTIVITAET_ARTEN;

export type Ereignis = {
  zeit: Date;
  art: AktivitaetArt;
  userId: string | null;
  nutzer: string | null;
  detail: string;
  href: string | null;
};

/*
  EIN UNION ALL über alle Quellen mit derselben Spaltenform (zeit, art,
  user_id, detail, href). Die Fachtabellen bleiben unberührt — der Feed ist
  reine Lesesicht und deshalb rückwirkend gefüllt. Roh-SQL, weil Drizzle
  UNIONs mit unterschiedlichen Quellen nicht lesbar ausdrückt.
*/
const QUELLE = sql`(
  SELECT l.zeitpunkt AS zeit, 'anmeldung' AS art, l.user_id AS user_id,
         coalesce(l.geraet, '') AS detail, NULL::text AS href
    FROM login_log l
  UNION ALL
  SELECT m.created_at, 'maschine', m.owner_id,
         m.modell || ' | ' || m.hersteller, '/machines/' || m.id
    FROM machines m
  UNION ALL
  SELECT f.datum, 'fehler', f.gemeldet_von,
         left(f.beschreibung, 90)
           || CASE WHEN f.gemeldet_von IS NULL
                   THEN ' — ' || coalesce(f.gemeldet_von_name, 'Gast') || ' (Gast)'
                   ELSE '' END,
         '/machines/' || f.machine_id || '?bereich=fehler'
    FROM faults f
  UNION ALL
  SELECT r.datum, 'reparatur', m.owner_id,
         left(coalesce(nullif(r.massnahme, ''), r.diagnose, ''), 90),
         '/machines/' || r.machine_id || '?bereich=reparaturen'
    FROM repairs r JOIN machines m ON m.id = r.machine_id
  UNION ALL
  SELECT w.datum, 'wartung', w.erledigt_von, coalesce(w.notiz, ''),
         '/machines/' || w.machine_id || '?bereich=wartung'
    FROM maintenance_log w
  UNION ALL
  SELECT k.created_at, 'wissen', k.created_by, k.typ || ': ' || k.titel, NULL
    FROM knowledge k
  UNION ALL
  SELECT fb.created_at, 'feedback', fb.created_by, fb.titel, '/feedback?tab=alle'
    FROM feedback fb
  UNION ALL
  SELECT ki.created_at, 'ki', ki.user_id, ki.zweck, NULL
    FROM ki_aufrufe ki
  UNION ALL
  SELECT i.created_at, 'einladung', i.invited_by, i.email, NULL
    FROM invitations i
  UNION ALL
  SELECT t.created_at, 'termin', t.created_by, t.titel,
         '/machines/' || t.machine_id || '?bereich=termine'
    FROM termine t
) e`;

export async function getAktivitaet(opts: {
  grenze: Date | null;
  userId?: string;
  art?: string;
  seite: number;
  proSeite: number;
}): Promise<{
  rows: Ereignis[];
  gesamt: number;
  arten: { art: AktivitaetArt; n: number }[];
}> {
  const bedingungen = [sql`true`];
  if (opts.grenze) bedingungen.push(sql`e.zeit >= ${opts.grenze}`);
  if (opts.userId) bedingungen.push(sql`e.user_id = ${opts.userId}`);
  const where = sql.join(bedingungen, sql` AND `);
  const artOk = opts.art && opts.art in AKTIVITAET_ARTEN ? opts.art : undefined;
  const whereMitArt = artOk ? sql`${where} AND e.art = ${artOk}` : where;

  try {
    const artenRows = await db.execute<{ art: AktivitaetArt; n: number }>(
      sql`SELECT e.art, count(*)::int AS n FROM ${QUELLE} WHERE ${where} GROUP BY e.art`,
    );
    const arten = [...artenRows].map((r) => ({ art: r.art, n: Number(r.n) }));
    const gesamt = artOk
      ? (arten.find((a) => a.art === artOk)?.n ?? 0)
      : arten.reduce((s, a) => s + a.n, 0);

    const rows = await db.execute<{
      zeit: string | Date;
      art: AktivitaetArt;
      user_id: string | null;
      nutzer: string | null;
      detail: string;
      href: string | null;
    }>(
      sql`SELECT e.zeit, e.art, e.user_id, u.name AS nutzer, e.detail, e.href
            FROM ${QUELLE}
            LEFT JOIN "user" u ON u.id = e.user_id
           WHERE ${whereMitArt}
           ORDER BY e.zeit DESC
           LIMIT ${opts.proSeite} OFFSET ${(opts.seite - 1) * opts.proSeite}`,
    );
    return {
      rows: [...rows].map((r) => ({
        zeit: alsDatum(r.zeit) ?? new Date(0),
        art: r.art,
        userId: r.user_id,
        nutzer: r.nutzer,
        detail: r.detail ?? "",
        href: r.href,
      })),
      gesamt,
      arten,
    };
  } catch (e) {
    // Schema-Drift-fest wie das WhatsApp-Protokoll: leerer Feed statt 500.
    console.error("[nutzung] Feed:", (e as Error).message);
    return { rows: [], gesamt: 0, arten: [] };
  }
}
