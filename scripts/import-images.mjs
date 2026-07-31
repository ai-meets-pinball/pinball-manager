/*
  Zweiter Schritt: OPDB-Bild je Modell nachziehen (nur wo image_url fehlt).
  Resumierbar (bei Abbruch einfach erneut starten). Gedrosselt (kleine Nebenläufig-
  keit + Backoff bei 429), damit OPDB nicht blockt. Bild-Wahl wie src/lib/opdb.ts.
*/
import fs from "node:fs";
import postgres from "postgres";

const env = fs.readFileSync(".env.local", "utf8");
const pick = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : undefined;
};
const token = pick("OPDB_API_KEY");
const sql = postgres(pick("POSTGRES_URL") || pick("DATABASE_URL"), {
  prepare: false,
  max: 2,
});

function pickImage(images) {
  if (!images?.length) return null;
  const punkte = (i) => (i.primary ? 2 : 0) + (i.type === "backglass" ? 1 : 0);
  const best = [...images].sort((a, b) => punkte(b) - punkte(a))[0];
  return best.urls?.medium ?? best.urls?.large ?? best.urls?.small ?? null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchImage(opdbRef, versuch = 0) {
  const res = await fetch(
    `https://opdb.org/api/machines/${encodeURIComponent(opdbRef)}?api_token=${token}`,
  );
  if (res.status === 429 && versuch < 4) {
    await sleep(1000 * (versuch + 1));
    return fetchImage(opdbRef, versuch + 1);
  }
  if (!res.ok) return { ok: false, status: res.status };
  const d = await res.json();
  return { ok: true, url: pickImage(d.images) };
}

const todo = await sql`
  SELECT id, opdb_ref FROM machine_models
  WHERE image_url IS NULL AND opdb_ref IS NOT NULL
  ORDER BY hersteller, modell`;
console.log(`${todo.length} Modelle ohne Bild.`);

const CONC = 4;
let gesetzt = 0,
  ohneBild = 0,
  fehler = 0,
  i = 0;

async function worker() {
  while (i < todo.length) {
    const m = todo[i++];
    try {
      const r = await fetchImage(m.opdb_ref);
      if (r.ok && r.url) {
        await sql`UPDATE machine_models SET image_url = ${r.url} WHERE id = ${m.id}`;
        gesetzt++;
      } else if (r.ok) {
        ohneBild++;
      } else {
        fehler++;
      }
    } catch {
      fehler++;
    }
    if ((gesetzt + ohneBild + fehler) % 100 === 0) {
      console.log(`… ${gesetzt + ohneBild + fehler}/${todo.length}`);
    }
    await sleep(60);
  }
}

await Promise.all(Array.from({ length: CONC }, worker));
console.log(
  `Bilder fertig: ${gesetzt} gesetzt, ${ohneBild} ohne OPDB-Bild, ${fehler} Fehler (erneut startbar).`,
);
await sql.end();
