/*
  Einmaliger Voll-Import: alle Automaten aus docs/machines-export.json als
  Gerätetypen (machine_models) anlegen — inkl. Generation (via generations-Name).
  Idempotent: ON CONFLICT (opdb_ref) DO NOTHING → vorhandene Modelle (und ihre
  Bilder/Hand-Zuordnungen) bleiben unangetastet. Bilder zieht import-images.mjs
  in einem zweiten Schritt nach.
*/
import fs from "node:fs";
import postgres from "postgres";

const env = fs.readFileSync(".env.local", "utf8");
const pick = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : undefined;
};
const sql = postgres(pick("POSTGRES_URL") || pick("DATABASE_URL"), {
  prepare: false,
  max: 1,
});

const raw = JSON.parse(fs.readFileSync("docs/machines-export.json", "utf8"));
const records = raw.machines ?? [];

// Generation-Name -> id (die 54 wurden bereits in Phase 4a angelegt).
const gens = await sql`SELECT id, name FROM generations`;
const genId = new Map(gens.map((g) => [g.name, g.id]));

let neu = 0;
let vorhanden = 0;
let ohneOpdb = 0;
let ohneGen = 0;

for (const r of records) {
  if (r.hidden) continue;
  if (!r.opdbId) {
    ohneOpdb++;
    continue;
  }
  const gid = r.generation?.name ? genId.get(r.generation.name) ?? null : null;
  if (!gid) ohneGen++;

  const res = await sql`
    INSERT INTO machine_models
      (opdb_ref, opdb_group_ref, hersteller, modell, baujahr, ipdb_ref,
       generation_id, generation_manuell)
    VALUES (${r.opdbId}, ${r.opdbId.split("-")[0]},
            ${r.manufacturer ?? "?"}, ${r.name ?? "?"}, ${r.year ?? null},
            ${r.ipdbId != null ? String(r.ipdbId) : null}, ${gid}, false)
    ON CONFLICT (opdb_ref) DO NOTHING
    RETURNING id`;
  if (res.length > 0) neu++;
  else vorhanden++;
}

const gesamt = (await sql`SELECT count(*)::int c FROM machine_models`)[0].c;
console.log(
  `Import fertig: ${neu} neu, ${vorhanden} schon vorhanden (unangetastet), ` +
    `${ohneOpdb} ohne opdbId übersprungen, ${ohneGen} ohne Generation-Treffer. ` +
    `machine_models gesamt: ${gesamt}`,
);
await sql.end();
