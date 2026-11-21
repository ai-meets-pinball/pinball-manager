import { del, get, list } from "@vercel/blob";
import { HANDBUCH_MAX_BYTES, HANDBUCH_TMP_ORDNER } from "@/lib/handbuch-tmp";

/*
  Der PRIVATE Blob-Store für große Handbücher (lib/handbuch-tmp.ts) — die
  einzige Stelle, die ihn anfasst. Eigener Token, damit nichts versehentlich im
  öffentlichen Foto-Store landet (der hängt an BLOB_READ_WRITE_TOKEN).
*/
export function handbuchToken(): string {
  const token = process.env.HANDBUCH_BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("HANDBUCH_BLOB_READ_WRITE_TOKEN fehlt.");
  return token;
}

/** Das hochgeladene PDF als File — wie es die Extraktion sonst aus dem Formular bekommt. */
export async function holeHandbuch(pfad: string): Promise<File> {
  const res = await get(pfad, { access: "private", token: handbuchToken(), useCache: false });
  if (!res || res.statusCode !== 200) throw new Error("Hochgeladenes Handbuch nicht gefunden.");
  if (res.blob.size > HANDBUCH_MAX_BYTES) throw new Error("Handbuch zu groß.");
  const bytes = await new Response(res.stream).arrayBuffer();
  const name = pfad.slice(pfad.lastIndexOf("/") + 1);
  return new File([bytes], name, { type: res.blob.contentType });
}

export async function loescheHandbuch(pfad: string): Promise<void> {
  await del(pfad, { token: handbuchToken() });
}

/** Alle PDFs im Zwischenordner — für den Aufräum-Job. */
export async function alleHandbuecher(): Promise<{ pathname: string; uploadedAt: Date }[]> {
  const blobs: { pathname: string; uploadedAt: Date }[] = [];
  let cursor: string | undefined;
  do {
    const seite = await list({ prefix: HANDBUCH_TMP_ORDNER, cursor, limit: 1000, token: handbuchToken() });
    for (const b of seite.blobs) blobs.push({ pathname: b.pathname, uploadedAt: b.uploadedAt });
    cursor = seite.hasMore ? seite.cursor : undefined;
  } while (cursor);
  return blobs;
}
