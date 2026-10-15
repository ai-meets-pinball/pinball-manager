/*
  Umzug des Datei-Bestands von Supabase Storage nach Vercel Blob (10/2026).

    npm run storage:umzug            # Vorschau: was würde umziehen? (schreibt nichts)
    npm run storage:umzug -- --apply # kopieren + URLs in der DB umschreiben

  Je gespeicherter Supabase-URL: Datei laden, mit gleichem relativen Pfad und
  gleichem Content-Type in den Blob legen, dann ALLE Spalten, die diese URL
  tragen, auf die neue URL umschreiben. Fotos, die früher direkt im Bucket-
  Wurzelverzeichnis lagen (Maschinenfotos), landen unter machine-photos/.

  Idempotent: schon umgezogene URLs sind keine Supabase-URLs mehr und werden
  übersprungen; ein zweiter Lauf fängt Nachzügler aus dem Übergang. Der alte
  Supabase-Bucket bleibt unangetastet — gelöscht wird später, separat.

  Braucht POSTGRES_URL (bzw. DATABASE_URL) und BLOB_READ_WRITE_TOKEN aus .env.local.
*/
import { config } from "dotenv";
import postgres from "postgres";
import { put } from "@vercel/blob";

config({ path: [".env.local", ".env"] });

const APPLY = process.argv.includes("--apply");
const MARKER = "/storage/v1/object/public/";
const ORDNER = ["fault-images", "avatars", "feedback", "club-logos", "user-logos", "machine-docs"];

/** Jede Spalte, die eine Speicher-URL tragen kann. */
const SPALTEN = [
  { tabelle: "machines", spalte: "foto_url", wo: "" },
  { tabelle: "fault_images", spalte: "url", wo: "" },
  { tabelle: `"user"`, spalte: "image", wo: "" },
  { tabelle: "clubs", spalte: "logo_url", wo: "" },
  { tabelle: "user_settings", spalte: "logo_url", wo: "" },
  { tabelle: "feedback", spalte: "screenshot_url", wo: "" },
  { tabelle: "machine_dokumente", spalte: "url", wo: "AND typ = 'datei'" },
] as const;

/** Relativer Pfad im alten Bucket → Pfad im Blob. */
function zielPfad(url: string): string {
  const rest = url.slice(url.indexOf(MARKER) + MARKER.length); // <bucket>/<pfad>
  const pfad = decodeURIComponent(rest.slice(rest.indexOf("/") + 1));
  return ORDNER.includes(pfad.split("/")[0]) ? pfad : `machine-photos/${pfad}`;
}

const sql = postgres((process.env.DATABASE_URL ?? process.env.POSTGRES_URL)!, {
  prepare: false,
  max: 1,
});

try {
  // 1. Alle Supabase-URLs einsammeln (je Spalte gezählt).
  const urls = new Set<string>();
  console.log(APPLY ? "== Umzug (--apply) ==" : "== Vorschau (nichts wird geschrieben) ==");
  for (const s of SPALTEN) {
    const rows = await sql.unsafe(
      `SELECT DISTINCT ${s.spalte} AS url FROM ${s.tabelle}
       WHERE ${s.spalte} LIKE '%${MARKER}%' ${s.wo}`,
    );
    for (const r of rows) urls.add(r.url as string);
    console.log(`${s.tabelle}.${s.spalte}: ${rows.length}`);
  }
  console.log(`Verschiedene Dateien: ${urls.size}`);

  // Nicht referenzierte Objekte im alten Bucket — nur zählen, nicht umziehen.
  const [{ n: imBucket }] = await sql`
    SELECT count(*)::int AS n FROM storage.objects WHERE bucket_id = 'machine-photos'`;
  console.log(`Objekte im alten Bucket: ${imBucket} (davon nicht referenziert: ${imBucket - urls.size}, bleiben liegen)`);

  // 2. Kopieren + umschreiben.
  let bytes = 0;
  let fertig = 0;
  for (const alt of urls) {
    const res = await fetch(alt);
    if (!res.ok) {
      console.log(`  FEHLT (${res.status}): ${alt}`);
      continue;
    }
    const inhalt = Buffer.from(await res.arrayBuffer());
    bytes += inhalt.byteLength;
    const typ = res.headers.get("content-type") ?? "application/octet-stream";
    const pfad = zielPfad(alt);
    if (!APPLY) {
      console.log(`  ${pfad}  ${typ}  ${Math.round(inhalt.byteLength / 1024)} KB`);
      continue;
    }
    const blob = await put(pfad, inhalt, {
      access: "public",
      contentType: typ,
      addRandomSuffix: false,
      allowOverwrite: true, // ein abgebrochener Lauf darf wiederholt werden
    });
    for (const s of SPALTEN) {
      await sql.unsafe(
        `UPDATE ${s.tabelle} SET ${s.spalte} = $1 WHERE ${s.spalte} = $2`,
        [blob.url, alt],
      );
    }
    fertig++;
    console.log(`  ✓ ${pfad}`);
  }
  console.log(`Gesamt: ${(bytes / 1024 / 1024).toFixed(1)} MB${APPLY ? `, umgezogen: ${fertig}/${urls.size}` : ""}`);
} finally {
  await sql.end();
}
