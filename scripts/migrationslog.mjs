/*
  Gemeinsame Helfer für migrate-status.mjs und migrate-reconcile.mjs.

  Bildet nach, wie der drizzle-Migrator (drizzle-orm, pg-core/dialect.js)
  entscheidet: Journal-Einträge (drizzle/meta/_journal.json) gegen die Tabelle
  drizzle.__drizzle_migrations — `hash` = SHA-256 des Dateiinhalts, `created_at`
  = `when` aus dem Journal. Der Migrator wendet alles an, dessen `when` NACH der
  letzten `created_at` liegt; scheitert eine Anweisung, rollt er ALLES zurück
  und drizzle-kit zeigt keine Fehlermeldung. Diese Skripte machen den Zustand
  sichtbar, bevor und nachdem man `db:migrate` startet.

  Datenbank: DATABASE_URL gewinnt (so lässt sich die E2E-DB ansprechen), sonst
  POSTGRES_URL aus der Umgebung, sonst aus .env.local.
*/
import fs from "node:fs";
import { createHash } from "node:crypto";
import postgres from "postgres";

export function verbindung() {
  let url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url && fs.existsSync(".env.local")) {
    const env = fs.readFileSync(".env.local", "utf8");
    const m = env.match(/^POSTGRES_URL=(.*)$/m);
    url = m?.[1]?.trim().replace(/^["']|["']$/g, "");
  }
  if (!url) throw new Error("Keine Datenbank-URL (DATABASE_URL / POSTGRES_URL).");
  return postgres(url, { max: 1, prepare: false, onnotice: () => {} });
}

/** Journal-Einträge samt Dateiinhalt und dem Hash, den der Migrator schreibt. */
export function journal() {
  const j = JSON.parse(fs.readFileSync("drizzle/meta/_journal.json", "utf8"));
  return j.entries.map((e) => {
    const text = fs.readFileSync(`drizzle/${e.tag}.sql`, "utf8");
    return {
      idx: e.idx,
      tag: e.tag,
      when: e.when,
      text,
      hash: createHash("sha256").update(text).digest("hex"),
    };
  });
}

/** Zeilen der Migrationstabelle — leer, wenn es sie noch nicht gibt. */
export async function verzeichnet(sql) {
  const vorhanden = await sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'`;
  if (vorhanden.length === 0) return [];
  return sql`SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`;
}

/** Gegenüberstellung: je Journal-Eintrag verzeichnet oder ausstehend; dazu
    DB-Zeilen ohne Journal-Gegenstück (fremde/gelöschte Migrationen). */
export async function abgleich(sql) {
  const eintraege = journal();
  const zeilen = await verzeichnet(sql);
  const nachHash = new Map(zeilen.map((z) => [z.hash, z]));
  const letzte = zeilen.length ? Math.max(...zeilen.map((z) => Number(z.created_at))) : null;
  const status = eintraege.map((e) => ({
    ...e,
    zeile: nachHash.get(e.hash) ?? null,
    // So entscheidet der Migrator wirklich: nur nach Zeit, nicht nach Hash.
    wuerdeLaufen: letzte === null || letzte < e.when,
  }));
  const journalHashes = new Set(eintraege.map((e) => e.hash));
  return {
    status,
    ohneJournal: zeilen.filter((z) => !journalHashes.has(z.hash)),
    letzte,
  };
}

export function datum(ms) {
  return new Date(Number(ms)).toISOString().slice(0, 16).replace("T", " ");
}
