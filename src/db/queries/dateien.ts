import { sql } from "drizzle-orm";
import { db } from "@/db";

/*
  Alle Datei-URLs, auf die irgendeine Zeile verweist — die Gegenprobe für den
  Aufräum-Job verwaister Uploads (lib/verwaiste-uploads.ts). EINE Abfrage
  (UNION) statt sieben, damit sie nicht den Pool füllt. Lieber eine Spalte zu
  viel als eine zu wenig: was hier fehlt, würde gelöscht. Neue Spalte mit
  Datei-URL → hier ergänzen.
*/
export async function getReferenzierteDateiUrls(): Promise<Set<string>> {
  const zeilen = await db.execute<{ url: string }>(sql`
    select foto_url as url from machines where foto_url is not null
    union select url from fault_images
    union select url from machine_dokumente where url is not null
    union select screenshot_url from feedback where screenshot_url is not null
    union select image from "user" where image is not null
    union select logo_url from clubs where logo_url is not null
    union select logo_url from user_settings where logo_url is not null
  `);
  return new Set([...zeilen].map((z) => z.url));
}
