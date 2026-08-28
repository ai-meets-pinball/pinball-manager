/*
  Katalog-Import aus dem OFFIZIELLEN OPDB-Export (Match Play), seit der
  opdb.org-API-Abschaltung 2026-10-01 der einzige Weg. Lädt den ÖFFENTLICHEN
  v2-Export (kein Token nötig) und upsertet alle Editionen als machine_models —
  inklusive Backglass-Bild (das der Export jetzt selbst liefert, Host img.opdb.org).

  Ersetzt import-models.mjs (Modelle) UND import-images.mjs (Bilder über die tote
  API). Idempotent + re-runnbar: bei Bedarf erneut ausführen, um neue Automaten
  und aktualisierte Bilder zu ziehen. Generation-Zuordnung bleibt Sache von
  seed-generations.mjs (OPDB-fremd) — dieses Skript fasst generation_* NICHT an.

  Reihenfolge:  node scripts/import-opdb.mjs   dann   node scripts/seed-generations.mjs

  ACHTUNG: schreibt in die verbundene DB (lokal = Prod machine_models).
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

const EXPORT_URL =
  "https://mp-data.sfo3.cdn.digitaloceanspaces.com/opdb-v2.json";

// Primäres Backglass, mittlere Größe — dieselbe Wahl wie zuvor die opdb.ts.
// Nur img.opdb.org zulassen (deckt sich mit der Allowlist in machines.ts /
// der CSP), damit kein fremder Host in <img src> landet.
function pickImage(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  const bg =
    images.find((i) => i.primary && i.type === "backglass") ??
    images.find((i) => i.type === "backglass") ??
    images[0];
  const url = bg?.urls?.medium ?? null;
  return url && url.startsWith("https://img.opdb.org/") ? url : null;
}

console.log("Lade", EXPORT_URL, "…");
const res = await fetch(EXPORT_URL);
if (!res.ok) {
  console.error("Download fehlgeschlagen:", res.status, res.statusText);
  process.exit(1);
}
const data = await res.json();
const entries = Array.isArray(data) ? data : (data.entries ?? []);
console.log(`${entries.length} Einträge geladen.`);

// Nur Editionen (entryType "machine"); Gruppen/Titel und Aliase überspringen —
// die App-Granularität ist die Edition (opdb_ref wie "G2Lkd-MNEdK").
const rows = [];
let mitBild = 0;
for (const e of entries) {
  if (e.entryType !== "machine") continue;
  const opdbRef = e.opdbId ?? e.opdbMachine;
  const hersteller = e.manufacturer?.name ?? e.manufacturerName ?? null;
  const modell = e.name ?? null;
  if (!opdbRef || !hersteller || !modell) continue;
  const image = pickImage(e.images);
  if (image) mitBild++;
  rows.push({
    opdb_ref: opdbRef,
    opdb_group_ref: e.opdbGroup ?? opdbRef.split("-")[0],
    hersteller,
    modell,
    baujahr: Number.isInteger(e.year) ? e.year : null,
    ipdb_ref: e.ipdbId != null ? String(e.ipdbId) : null,
    image_url: image,
  });
}
console.log(`${rows.length} Editionen zum Upsert (davon ${mitBild} mit Bild).`);

const cols = [
  "opdb_ref",
  "opdb_group_ref",
  "hersteller",
  "modell",
  "baujahr",
  "ipdb_ref",
  "image_url",
];
const CHUNK = 500;
let verarbeitet = 0;
for (let i = 0; i < rows.length; i += CHUNK) {
  const chunk = rows.slice(i, i + CHUNK);
  // COALESCE beim Bild: ein bereits gesetztes Bild nicht durch NULL überschreiben.
  // generation_id / generation_manuell bleiben bewusst unberührt.
  await sql`
    INSERT INTO machine_models ${sql(chunk, ...cols)}
    ON CONFLICT (opdb_ref) DO UPDATE SET
      opdb_group_ref = EXCLUDED.opdb_group_ref,
      hersteller = EXCLUDED.hersteller,
      modell = EXCLUDED.modell,
      baujahr = EXCLUDED.baujahr,
      ipdb_ref = EXCLUDED.ipdb_ref,
      image_url = COALESCE(EXCLUDED.image_url, machine_models.image_url),
      fetched_at = now()
  `;
  verarbeitet += chunk.length;
  process.stdout.write(`\r${verarbeitet}/${rows.length} upserted…`);
}

const gesamt = (await sql`SELECT count(*)::int c FROM machine_models`)[0].c;
const bilder = (
  await sql`SELECT count(*)::int c FROM machine_models WHERE image_url IS NOT NULL`
)[0].c;
console.log(
  `\nFertig. machine_models gesamt: ${gesamt}, davon mit Bild: ${bilder}.`,
);
await sql.end();
