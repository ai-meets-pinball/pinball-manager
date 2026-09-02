/*
  db:reconcile — Migrationslog nachführen, OHNE Migrationen zu wiederholen.

  Für Datenbanken, die per `drizzle-kit push` (oder von Hand) auf den Schema-
  Stand gebracht wurden: die Wirkung der Migrationen ist da, das Log nicht.
  `drizzle-kit migrate` versucht dann, alles seit dem letzten Log-Eintrag erneut
  auszuführen, scheitert an „existiert bereits" und rollt stumm zurück.

  Dieses Skript prüft je ausstehendem Journal-Eintrag, ob seine Objekte
  existieren (Tabellen, Spalten, Indizes, Typen, Enum-Werte, Constraints, RLS,
  DROPs als Abwesenheit; Daten-Migrationen über gezielte Abfragen), und trägt
  NUR bei bestandener Prüfung die Zeile ein, die der Migrator selbst geschrieben
  hätte (hash = SHA-256 der Datei, created_at = when aus dem Journal).

    npm run db:reconcile            # Vorschau (ändert nichts)
    npm run db:reconcile -- --apply # einträgt — in EINER Transaktion
  Anweisungen, die das Skript nicht prüfen kann (z. B. UPDATE-Backfills), werden
  als „ungeprüft" gemeldet; sie blockieren nicht, sind aber im Bericht zu sehen.
*/
import { abgleich, datum, journal, verbindung } from "./migrationslog.mjs";

const apply = process.argv.includes("--apply");
const sql = verbindung();

/* Erkennbare DDL → Existenzprüfung. Jede Regel: Muster, dann Prüf-Abfrage. */
const PRUEFER = [
  { re: /CREATE TABLE (?:IF NOT EXISTS )?"?(\w+)"?/gi, art: "Tabelle", da: async (m) =>
      (await sql`SELECT 1 FROM information_schema.tables WHERE table_name=${m[1]}`).length > 0 },
  { re: /ALTER TABLE "?(\w+)"? ADD COLUMN (?:IF NOT EXISTS )?"?(\w+)"?/gi, art: "Spalte", da: async (m) =>
      (await sql`SELECT 1 FROM information_schema.columns WHERE table_name=${m[1]} AND column_name=${m[2]}`).length > 0,
    name: (m) => `${m[1]}.${m[2]}` },
  { re: /CREATE (?:UNIQUE )?INDEX (?:IF NOT EXISTS )?"?(\w+)"?/gi, art: "Index", da: async (m) =>
      (await sql`SELECT 1 FROM pg_indexes WHERE indexname=${m[1]}`).length > 0 },
  { re: /CREATE TYPE "?(?:public"?\."?)?(\w+)"?/gi, art: "Typ", da: async (m) =>
      (await sql`SELECT 1 FROM pg_type WHERE typname=${m[1]}`).length > 0 },
  { re: /ALTER TYPE "?(?:public"?\."?)?(\w+)"? ADD VALUE (?:IF NOT EXISTS )?'([^']+)'/gi, art: "Enum-Wert", da: async (m) =>
      (await sql`SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname=${m[1]} AND e.enumlabel=${m[2]}`).length > 0,
    name: (m) => `${m[1]}.${m[2]}` },
  { re: /ADD CONSTRAINT "?(\w+)"?/gi, art: "Constraint", da: async (m) =>
      (await sql`SELECT 1 FROM pg_constraint WHERE conname=${m[1]}`).length > 0 },
  { re: /ALTER TABLE "?(\w+)"? ENABLE ROW LEVEL SECURITY/gi, art: "RLS", da: async (m) =>
      Boolean((await sql`SELECT relrowsecurity FROM pg_class WHERE relname=${m[1]}`)[0]?.relrowsecurity) },
  // DROPs: das Objekt darf NICHT mehr da sein.
  { re: /DROP TABLE (?:IF EXISTS )?"?(\w+)"?/gi, art: "Tabelle weg", da: async (m) =>
      (await sql`SELECT 1 FROM information_schema.tables WHERE table_name=${m[1]}`).length === 0 },
  { re: /ALTER TABLE "?(\w+)"? DROP COLUMN (?:IF EXISTS )?"?(\w+)"?/gi, art: "Spalte weg", da: async (m) =>
      (await sql`SELECT 1 FROM information_schema.columns WHERE table_name=${m[1]} AND column_name=${m[2]}`).length === 0,
    name: (m) => `${m[1]}.${m[2]}` },
  { re: /DROP CONSTRAINT (?:IF EXISTS )?"?(\w+)"?/gi, art: "Constraint weg", da: async (m) =>
      (await sql`SELECT 1 FROM pg_constraint WHERE conname=${m[1]}`).length === 0 },
  { re: /DROP INDEX (?:IF EXISTS )?"?(\w+)"?/gi, art: "Index weg", da: async (m) =>
      (await sql`SELECT 1 FROM pg_indexes WHERE indexname=${m[1]}`).length === 0 },
];

/* Daten-Migrationen ohne DDL: gezielte Wirkungsprüfung je Tag. */
const DATENPRUEFER = {
  "0044_supporter_weg_gast_user": async () => {
    const keys = (await sql`SELECT key FROM roles`).map((r) => r.key);
    return !keys.includes("supporter") && keys.includes("gast") && keys.includes("user");
  },
  "0055_opdb_machine_ref_backfill": async () => {
    const [r] = await sql`
      SELECT count(*) FILTER (WHERE split_part(btrim(opdb_ref),'-',2) <> '' AND opdb_machine_ref IS NULL)::int AS offen
      FROM machine_models`;
    return r.offen === 0;
  },
};

const DDL_STARTS = /^\s*(CREATE|ALTER|DROP)\b/i;

/*
  Eine Migration wird nicht isoliert geprüft, sondern gegen den ENDZUSTAND:
  legt Migration N eine Tabelle/Spalte/Constraint an, die eine SPÄTERE wieder
  entfernt, darf das Objekt heute fehlen — und umgekehrt darf ein in N
  entferntes Objekt heute existieren, wenn eine spätere es neu anlegt (z. B.
  Constraint mit gleichem Namen). Sonst scheitert jede Datenbank, deren
  Schema-Geschichte mehr als eine Migration lang ist.
*/
function spaeterEntfernt(name, art, spaetere) {
  const [tabelle, spalte] = name.split(".");
  return spaetere.some((t) => {
    if (art === "Tabelle" || art === "RLS") return new RegExp(`DROP TABLE (?:IF EXISTS )?"?${name}"?\\b`, "i").test(t);
    if (art === "Spalte") return new RegExp(`DROP TABLE (?:IF EXISTS )?"?${tabelle}"?\\b|ALTER TABLE "?${tabelle}"? DROP COLUMN (?:IF EXISTS )?"?${spalte}"?\\b`, "i").test(t);
    if (art === "Constraint") return new RegExp(`DROP CONSTRAINT (?:IF EXISTS )?"?${name}"?\\b|DROP TABLE`, "i").test(t);
    if (art === "Index") return new RegExp(`DROP INDEX (?:IF EXISTS )?"?${name}"?\\b|DROP TABLE`, "i").test(t);
    if (art === "Typ") return new RegExp(`DROP TYPE (?:IF EXISTS )?"?(?:public"?\\."?)?${name}"?\\b`, "i").test(t);
    // Enum-Wert: mit dem Typ verschwindet auch der Wert (name = "typ.wert").
    if (art === "Enum-Wert") return new RegExp(`DROP TYPE (?:IF EXISTS )?"?(?:public"?\\."?)?${tabelle}"?\\b`, "i").test(t);
    return false;
  });
}
function spaeterAngelegt(name, art, spaetere) {
  const [tabelle, spalte] = name.split(".");
  return spaetere.some((t) => {
    if (art === "Tabelle weg") return new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?"?${name}"?\\b`, "i").test(t);
    if (art === "Spalte weg") return new RegExp(`ALTER TABLE "?${tabelle}"? ADD COLUMN (?:IF NOT EXISTS )?"?${spalte}"?\\b`, "i").test(t);
    if (art === "Constraint weg") return new RegExp(`ADD CONSTRAINT "?${name}"?\\b`, "i").test(t);
    if (art === "Index weg") return new RegExp(`CREATE (?:UNIQUE )?INDEX (?:IF NOT EXISTS )?"?${name}"?\\b`, "i").test(t);
    return false;
  });
}

async function pruefe(eintrag, spaetere) {
  const befunde = []; // { art, name, ok, hinweis? }
  let ungeprueft = 0;
  for (const p of PRUEFER) {
    for (const m of eintrag.text.matchAll(p.re)) {
      const name = p.name ? p.name(m) : m[1];
      let ok = await p.da(m);
      let hinweis;
      // Die eigene Datei zählt mit: „DROP CONSTRAINT x" + „ADD CONSTRAINT x" in
      // derselben Migration heißt am Ende „existiert".
      const danach = [eintrag.text, ...spaetere];
      if (!ok && p.art.endsWith(" weg") && spaeterAngelegt(name, p.art, danach)) { ok = true; hinweis = "später neu angelegt"; }
      if (!ok && !p.art.endsWith(" weg") && spaeterEntfernt(name, p.art, danach)) { ok = true; hinweis = "später entfernt"; }
      befunde.push({ art: p.art, name, ok, hinweis });
    }
  }
  if (DATENPRUEFER[eintrag.tag]) {
    befunde.push({ art: "Daten", name: eintrag.tag, ok: await DATENPRUEFER[eintrag.tag]() });
  } else {
    // Anweisungen, die keine der Regeln trifft (Backfills, Kommentare zählen nicht).
    const stmts = eintrag.text.split("--> statement-breakpoint").map((s) => s.replace(/--[^\n]*/g, "").trim()).filter(Boolean);
    ungeprueft = stmts.filter((s) => !DDL_STARTS.test(s)).length;
  }
  return { befunde, ungeprueft, ok: befunde.every((b) => b.ok) };
}

try {
  const { status } = await abgleich(sql);
  const offen = status.filter((s) => !s.zeile);
  if (offen.length === 0) { console.log("Nichts ausstehend — Log ist vollständig."); process.exit(0); }

  const ergebnisse = [];
  const alle = journal();
  for (const e of offen) {
    const spaetere = alle.filter((x) => x.when > e.when).map((x) => x.text);
    const r = await pruefe(e, spaetere);
    ergebnisse.push({ e, r });
    const fehl = r.befunde.filter((b) => !b.ok);
    const nachsicht = r.befunde.filter((b) => b.hinweis).length;
    console.log(`${r.ok ? "ok    " : "FEHLT "} ${e.tag}  (${datum(e.when)})  ${r.befunde.length} Prüfungen${nachsicht ? `, ${nachsicht} durch spätere Migration überholt` : ""}${r.ungeprueft ? `, ${r.ungeprueft} ungeprüft` : ""}`);
    for (const b of fehl) console.log(`         ✗ ${b.art} ${b.name}`);
  }
  const blockiert = ergebnisse.filter((x) => !x.r.ok);
  if (blockiert.length) {
    console.log(`\n${blockiert.length} Migration(en) mit fehlenden Objekten — nichts eingetragen. Erst klären, dann erneut.`);
    process.exit(1);
  }
  if (!apply) {
    console.log(`\nVorschau: ${offen.length} Zeile(n) würden eingetragen. Mit --apply ausführen.`);
    process.exit(0);
  }
  await sql.begin(async (tx) => {
    await tx.unsafe(`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
    await tx.unsafe(`CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`);
    for (const { e } of ergebnisse) {
      await tx`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${e.hash}, ${e.when})`;
    }
  });
  console.log(`\nEingetragen: ${ergebnisse.length} Zeile(n). Jetzt \`db:status\` und \`db:migrate\` (erwartet: No-op).`);
} finally {
  await sql.end();
}
