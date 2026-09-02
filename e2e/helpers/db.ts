import postgres from "postgres";

/*
  Direkter DB-Zugriff für Seeding und Aufräumen.

  Bewusst gegen E2E_DATABASE_URL — niemals gegen die produktive Datenbank.
  Zur Sicherheit wird die URL zusätzlich gegen POSTGRES_URL geprüft: sind sie
  identisch, bricht alles ab, statt echte Daten zu löschen.
*/

const url = process.env.E2E_DATABASE_URL;
if (!url) throw new Error("E2E_DATABASE_URL fehlt");
if (process.env.POSTGRES_URL && process.env.POSTGRES_URL === url) {
  throw new Error(
    "E2E_DATABASE_URL zeigt auf dieselbe Datenbank wie POSTGRES_URL — abgebrochen.",
  );
}

export const sql = postgres(url, { prepare: false, max: 2 });

/** Alle Testdaten entfernen. Greift ausschließlich auf die e2e-Namensräume zu,
    damit ein versehentlicher Lauf gegen eine falsche DB nichts Fremdes trifft. */
export async function cleanupTestData() {
  await sql`DELETE FROM shares WHERE owner_id IN (SELECT id FROM "user" WHERE email LIKE '%@e2e.local')`;
  await sql`DELETE FROM machines WHERE owner_id IN (SELECT id FROM "user" WHERE email LIKE '%@e2e.local')`;
  await sql`DELETE FROM invitations WHERE email LIKE '%@e2e.local'`;
  await sql`DELETE FROM clubs WHERE name LIKE 'E2E %'`;
  await sql`DELETE FROM "user" WHERE email LIKE '%@e2e.local'`;
}

/** Legt eine Einladung an und gibt den Token zurück (echter Ablauf). */
export async function createInvitation(opts: {
  email: string;
  invitedBy: string;
  clubId?: string | null;
  roleKey?: string | null;
}) {
  const token = `e2e-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const roleId = opts.roleKey
    ? (await sql`SELECT id FROM roles WHERE key = ${opts.roleKey}`)[0]?.id
    : null;

  await sql`
    INSERT INTO invitations (club_id, role_id, email, token, invited_by, status, expires_at)
    VALUES (${opts.clubId ?? null}, ${roleId ?? null}, ${opts.email}, ${token},
            ${opts.invitedBy}, 'pending', now() + interval '1 day')`;
  return token;
}

export async function userIdByEmail(email: string): Promise<string> {
  const rows = await sql`SELECT id FROM "user" WHERE email = ${email}`;
  if (!rows[0]) throw new Error(`Testnutzer ${email} existiert nicht`);
  return rows[0].id;
}

export async function createClub(name: string, ownerId: string) {
  const [club] = await sql`
    INSERT INTO clubs (name, created_by) VALUES (${name}, ${ownerId}) RETURNING id`;
  const [ownerRole] = await sql`SELECT id FROM roles WHERE key='owner'`;
  await sql`INSERT INTO role_assignments (user_id, role_id, club_id)
            VALUES (${ownerId}, ${ownerRole.id}, ${club.id})`;
  return club.id as string;
}

export async function addMember(clubId: string, userId: string, roleKey: string) {
  const [role] = await sql`SELECT id FROM roles WHERE key=${roleKey}`;
  await sql`INSERT INTO role_assignments (user_id, role_id, club_id)
            VALUES (${userId}, ${role.id}, ${clubId})
            ON CONFLICT DO NOTHING`;
}

/** Maschine samt Modell anlegen (OPDB wird nicht angefragt). */
export async function createMachine(opts: {
  ownerId: string;
  clubId?: string | null;
  opdbRef?: string;
  modell?: string;
}) {
  const opdbRef = opts.opdbRef ?? "E2E1-MTEST";
  // Familienschlüssel wie lib/opdb-ref.ts: erste zwei Segmente, sonst NULL.
  const [gruppe, maschine] = opdbRef.split("-");
  const familie = gruppe && maschine ? `${gruppe}-${maschine}` : null;
  const [model] = await sql`
    INSERT INTO machine_models (opdb_ref, opdb_group_ref, opdb_machine_ref, hersteller, modell)
    VALUES (${opdbRef}, ${gruppe}, ${familie}, 'E2E Werke', ${opts.modell ?? "E2E Automat"})
    ON CONFLICT (opdb_ref) DO UPDATE SET opdb_ref = EXCLUDED.opdb_ref
    RETURNING id`;

  const [machine] = await sql`
    INSERT INTO machines (owner_id, club_id, model_id, hersteller, modell, opdb_ref)
    VALUES (${opts.ownerId}, ${opts.clubId ?? null}, ${model.id},
            'E2E Werke', ${opts.modell ?? "E2E Automat"}, ${opdbRef})
    RETURNING id`;
  return { machineId: machine.id as string, modelId: model.id as string };
}

/** Handbuch-Fakten als MODELL-Wissen (`knowledge`) anlegen — Datenmodell-Redesign
    Phase 1. Sichtbarkeit steuert, wer den Eintrag außer dem Autor sehen darf. */
export async function addKnowledge(opts: {
  modelId: string;
  createdBy: string;
  visibility?: "privat" | "club" | "oeffentlich";
  clubId?: string | null;
}) {
  const [row] = await sql`
    INSERT INTO knowledge
      (typ, titel, inhalt, source_type, visibility, model_id, club_id, created_by)
    VALUES ('handbuch_fakten', 'E2E Handbuch-Daten',
            ${sql.json({ coils: { columns: ["Sol/No", "Funktion"], rows: [["1", "E2E Spule"]] } })},
            'extrahiert', ${opts.visibility ?? "privat"}, ${opts.modelId},
            ${opts.clubId ?? null}, ${opts.createdBy})
    RETURNING id`;
  return row.id as string;
}

/** Anzahl der Verlaufs-Revisionen eines Wissenseintrags. */
export async function revisionCount(knowledgeId: string): Promise<number> {
  const [r] = await sql`
    SELECT count(*)::int AS n FROM knowledge_revisions
    WHERE knowledge_id = ${knowledgeId}`;
  return r.n as number;
}

/** Ein Community-Signal direkt setzen (für Schwellwert-Tests). */
export async function addSignal(
  knowledgeId: string,
  userId: string,
  wert: "hilfreich" | "falsch",
) {
  await sql`
    INSERT INTO knowledge_signals (knowledge_id, user_id, wert)
    VALUES (${knowledgeId}, ${userId}, ${wert})
    ON CONFLICT (knowledge_id, user_id) DO UPDATE SET wert = EXCLUDED.wert`;
}

export async function addRepair(machineId: string) {
  const [r] = await sql`
    INSERT INTO repairs (machine_id, diagnose, massnahme, teile, kosten, zeit, status)
    VALUES (${machineId}, 'E2E Diagnose', 'E2E Massnahme', 'E2E Teil', 99.99, 42, 'erledigt')
    RETURNING id`;
  return r.id as string;
}

/** Einen Fehler direkt anlegen (für den Maschinen-Status-Test). */
export async function addFault(opts: {
  machineId: string;
  beschreibung?: string;
  gemeldetVon?: string | null;
  prioritaet?: "niedrig" | "mittel" | "hoch" | "kritisch";
  status?: "offen" | "in Arbeit" | "behoben";
}): Promise<string> {
  const [r] = await sql`
    INSERT INTO faults (machine_id, beschreibung, prioritaet, status, gemeldet_von)
    VALUES (${opts.machineId}, ${opts.beschreibung ?? "E2E Fehler"},
            ${opts.prioritaet ?? "mittel"}, ${opts.status ?? "offen"},
            ${opts.gemeldetVon ?? null})
    RETURNING id`;
  return r.id as string;
}

/** Aktuellen Betriebsstatus einer Maschine lesen. */
export async function machineStatus(
  machineId: string,
): Promise<{ status: string; manuell: boolean }> {
  const [r] = await sql`
    SELECT status, status_manuell FROM machines WHERE id = ${machineId}`;
  return { status: r.status as string, manuell: r.status_manuell as boolean };
}

/** Einen Wartungs-Erledigt-Eintrag direkt setzen (für „Letzte Wartung"). */
export async function addMaintenanceLog(machineId: string) {
  // Ein Wartungspunkt wird gebraucht (FK), dann der Log-Eintrag.
  const [t] = await sql`
    INSERT INTO maintenance_tasks (machine_id, titel, intervall_typ)
    VALUES (${machineId}, 'E2E Wartungspunkt', 'bedarf')
    RETURNING id`;
  await sql`
    INSERT INTO maintenance_log (task_id, machine_id, datum)
    VALUES (${t.id}, ${machineId}, now())`;
}

/** Eine Generation anlegen (idempotent per Name) und einem Modell zuordnen —
    damit lässt sich der Generation-Resolver testen. */
export async function setModelGeneration(modelId: string, name: string) {
  const [g] = await sql`
    INSERT INTO generations (name) VALUES (${name})
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`;
  await sql`
    UPDATE machine_models SET generation_id = ${g.id}, generation_manuell = true
    WHERE id = ${modelId}`;
  return g.id as string;
}

/** Einen Troubleshooting-Guide als Wissenseintrag (`knowledge`,
    typ='troubleshooting') anlegen. GENAU eine Ebene angeben (generation | model |
    machine) — der Check-Constraint verlangt es. `inhalt` ist der Umschlag
    { guide, websuche, model }, den KnowledgeGuides/TroubleshootingGuideView lesen. */
export async function addGuide(opts: {
  createdBy: string;
  generationId?: string | null;
  modelId?: string | null;
  machineId?: string | null;
  visibility?: "privat" | "club" | "oeffentlich";
  clubId?: string | null;
}) {
  const inhalt = {
    guide: {
      plattform: "E2E-Plattform",
      abschnitte: [
        { titel: "E2E-Abschnitt", bloecke: [{ typ: "text", text: "E2E Hinweis" }] },
      ],
      quellen: [],
    },
    websuche: true,
    model: "e2e",
  };
  await sql`
    INSERT INTO knowledge
      (typ, titel, inhalt, source_type, visibility,
       generation_id, model_id, machine_id, club_id, created_by)
    VALUES ('troubleshooting', 'E2E Guide', ${sql.json(inhalt)}, 'eigen',
            ${opts.visibility ?? "privat"}, ${opts.generationId ?? null},
            ${opts.modelId ?? null}, ${opts.machineId ?? null},
            ${opts.clubId ?? null}, ${opts.createdBy})`;
}
