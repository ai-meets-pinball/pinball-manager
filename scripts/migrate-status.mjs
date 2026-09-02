/*
  db:status — was würde `drizzle-kit migrate` tun, und was ist verzeichnet?
  Nur lesen. Vor und nach jedem `db:migrate` einmal laufen lassen, weil
  drizzle-kit bei einem Fehler stumm bleibt (Spinner, kein „[✓] migrations
  applied successfully!").

    npm run db:status                         # produktive DB (POSTGRES_URL)
    DATABASE_URL=$E2E_DATABASE_URL npm run db:status
*/
import { abgleich, datum, verbindung } from "./migrationslog.mjs";

const sql = verbindung();
try {
  const { status, ohneJournal, letzte } = await abgleich(sql);
  const verz = status.filter((s) => s.zeile);
  const offen = status.filter((s) => !s.zeile);
  console.log(`Journal: ${status.length} Einträge · verzeichnet: ${verz.length} · ausstehend: ${offen.length}`);
  console.log(`Letzte verzeichnete Migration: ${letzte ? datum(letzte) : "keine"}`);
  for (const s of offen) {
    console.log(`  ausstehend  ${s.tag}  (${datum(s.when)})${s.wuerdeLaufen ? "" : "  ← würde NICHT laufen (älter als die letzte verzeichnete)"}`);
  }
  if (ohneJournal.length) {
    console.log(`DB-Zeilen ohne Journal-Gegenstück: ${ohneJournal.length}`);
    for (const z of ohneJournal) console.log(`  #${z.id}  ${datum(z.created_at)}  ${z.hash.slice(0, 12)}…`);
  }
  if (offen.length === 0 && ohneJournal.length === 0) console.log("Alles im Lot: db:migrate wäre ein No-op.");
} finally {
  await sql.end();
}
