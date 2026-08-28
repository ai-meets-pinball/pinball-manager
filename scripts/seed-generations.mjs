/*
  Einmaliges Seed: den lokalen Katalog-Export (docs/machines-export.json) in
  `generations` + `machine_models.generation_id` einspielen. Nutzt reines SQL
  (die App-Kernlogik lib/generation-catalog.ts lässt sich hier wegen des
  @/-Alias nicht direkt importieren), spiegelt aber exakt deren Semantik:
  Generationen per Name (unique) upserten, Modelle nur zuordnen, wenn nicht von
  Hand gesetzt (generation_manuell=false). Danach ein HEURISTISCHER Fallback für
  noch offene Modelle: passt der Hersteller UND fällt das Baujahr ins Jahresfenster
  GENAU EINER Generation, wird sie zugeordnet (mehrdeutige oder fehlende Treffer
  bleiben leer; Hand-Zuordnungen bleiben unberührt).
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
const records = Array.isArray(raw) ? raw : raw.machines ?? [];

const genMeta = new Map();
const byMachine = new Map();
const byGroup = new Map();
for (const r of records) {
  const name = r.generation?.name;
  if (!name) continue;
  const meta = genMeta.get(name) ?? { hersteller: null, jahrVon: null, jahrBis: null };
  if (r.manufacturer && !meta.hersteller) meta.hersteller = r.manufacturer;
  if (typeof r.year === "number") {
    meta.jahrVon = meta.jahrVon == null ? r.year : Math.min(meta.jahrVon, r.year);
    meta.jahrBis = meta.jahrBis == null ? r.year : Math.max(meta.jahrBis, r.year);
  }
  genMeta.set(name, meta);
  if (r.opdbId) {
    byMachine.set(r.opdbId, name);
    const g = r.opdbId.split("-")[0];
    if (!byGroup.has(g)) byGroup.set(g, name);
  }
}

let neu = 0;
for (const [name, meta] of genMeta) {
  const res = await sql`
    INSERT INTO generations (name, hersteller, jahr_von, jahr_bis)
    VALUES (${name}, ${meta.hersteller}, ${meta.jahrVon}, ${meta.jahrBis})
    ON CONFLICT (name) DO NOTHING
    RETURNING id`;
  if (res.length > 0) neu++;
}

const alleGen = await sql`SELECT id, name FROM generations`;
const genId = new Map(alleGen.map((g) => [g.name, g.id]));

const modelle = await sql`
  SELECT id, opdb_ref, opdb_group_ref, generation_id, generation_manuell
  FROM machine_models`;

let zugeordnet = 0;
let manuell = 0;
let ohne = 0;
for (const m of modelle) {
  const name =
    (m.opdb_ref && byMachine.get(m.opdb_ref)) ||
    (m.opdb_group_ref && byGroup.get(m.opdb_group_ref)) ||
    null;
  if (!name) {
    ohne++;
    continue;
  }
  if (m.generation_manuell) {
    manuell++;
    continue;
  }
  const gid = genId.get(name);
  if (gid && m.generation_id !== gid) {
    await sql`UPDATE machine_models SET generation_id = ${gid} WHERE id = ${m.id}`;
    zugeordnet++;
  }
}

// Heuristischer Fallback für noch offene Modelle (kein OPDB-Ref-Treffer im
// Mirror): Hersteller identisch (case-insensitive) UND Baujahr im Fenster
// [jahr_von, jahr_bis] GENAU EINER Generation → zuordnen. Mehrere passende
// Fenster = mehrdeutig → bewusst leer lassen. Erst NACH der Ref-Zuordnung, damit
// exakte Ref-Treffer Vorrang haben; nur Modelle mit noch leerer Generation.
const genFenster = await sql`
  SELECT id, hersteller, jahr_von, jahr_bis FROM generations
  WHERE hersteller IS NOT NULL AND jahr_von IS NOT NULL AND jahr_bis IS NOT NULL`;
const offen = await sql`
  SELECT id, hersteller, baujahr FROM machine_models
  WHERE generation_id IS NULL AND generation_manuell = false AND baujahr IS NOT NULL`;
let heuristik = 0;
let mehrdeutig = 0;
for (const m of offen) {
  const h = m.hersteller.toLowerCase();
  const treffer = genFenster.filter(
    (g) =>
      g.hersteller.toLowerCase() === h &&
      m.baujahr >= g.jahr_von &&
      m.baujahr <= g.jahr_bis,
  );
  if (treffer.length === 1) {
    await sql`UPDATE machine_models SET generation_id = ${treffer[0].id} WHERE id = ${m.id}`;
    heuristik++;
  } else if (treffer.length > 1) {
    mehrdeutig++;
  }
}

console.log(
  `Generationen gesamt: ${alleGen.length} (${neu} neu) · ` +
    `per Ref zugeordnet: ${zugeordnet} · manuell übersprungen: ${manuell} · ohne Ref-Treffer: ${ohne}\n` +
    `Heuristik (Hersteller+Baujahr): ${heuristik} zugeordnet, ${mehrdeutig} mehrdeutig übersprungen`,
);
await sql.end();
