import { del, list } from "@vercel/blob";
import { getReferenzierteDateiUrls } from "@/db/queries";
import { cronBerechtigt } from "@/lib/cron-auth";
import { verwaisteBlobs, type GespeicherterBlob } from "@/lib/verwaiste-uploads";

/*
  Täglicher Aufräum-Job (Vercel Cron → vercel.json): löscht Direkt-Uploads, auf
  die keine Zeile mehr verweist — gewählt und nie gespeichert, oder übrig von
  gelöschten Fehlern/Maschinen. WAS gelöscht wird, entscheidet die reine Regel
  lib/verwaiste-uploads.ts; hier nur Speicher lesen, DB gegenprüfen, löschen.

  `?probe=1` löscht nichts und liefert nur die Liste — zum Nachsehen, bevor der
  Job scharf läuft. Absicherung wie alle Crons: CRON_SECRET (lib/cron-auth.ts).
*/

export const dynamic = "force-dynamic";

async function alleBlobs(): Promise<GespeicherterBlob[]> {
  const blobs: GespeicherterBlob[] = [];
  let cursor: string | undefined;
  do {
    const seite = await list({ cursor, limit: 1000 });
    for (const b of seite.blobs) {
      blobs.push({ url: b.url, pathname: b.pathname, uploadedAt: b.uploadedAt });
    }
    cursor = seite.hasMore ? seite.cursor : undefined;
  } while (cursor);
  return blobs;
}

export async function GET(req: Request) {
  if (!cronBerechtigt(req)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const probe = new URL(req.url).searchParams.get("probe") === "1";

  // Erst der Speicher, dann die DB: eine Datei, die dazwischen gespeichert
  // wird, ist jünger als die Schonfrist und fällt ohnehin heraus.
  const blobs = await alleBlobs();
  const referenziert = await getReferenzierteDateiUrls();
  const verwaist = verwaisteBlobs(blobs, referenziert, new Date());

  if (!probe && verwaist.length > 0) {
    await del(verwaist.map((b) => b.url));
  }
  return Response.json({
    probe,
    geprueft: blobs.length,
    verwaist: verwaist.length,
    geloescht: probe ? 0 : verwaist.length,
    pfade: verwaist.map((b) => b.pathname),
  });
}
