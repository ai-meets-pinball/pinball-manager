import { createClient } from "@supabase/supabase-js";

/*
  Supabase wird AUSSCHLIESSLICH als Storage genutzt (PRD §7) — nicht für Auth, nicht für Daten.
  Der Service-Role-Key bleibt serverseitig; diese Datei darf nie aus Client-Code importiert werden.
*/

const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? "machine-photos";

// SUPABASE_URL ist der Fallback, den die Vercel-Supabase-Integration automatisch setzt.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!;

function storageClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/*
  Erlaubte Bildformate. Der Bucket ist ÖFFENTLICH lesbar — würden Endung und
  Content-Type aus der hochgeladenen Datei übernommen, ließe sich dort eine
  `payload.html` als `text/html` ablegen und ausliefern. Deshalb wird weder
  `file.name` noch `file.type` vertraut: der Typ wird aus den echten
  Dateibytes bestimmt, und Endung wie Content-Type folgen daraus.
*/
const ERLAUBTE_BILDTYPEN = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
} as const;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Bestimmt den Bildtyp anhand der Signatur (Magic Bytes), nicht anhand des
    vom Client gemeldeten MIME-Typs. Liefert null bei allem anderen. */
function erkenneBildtyp(b: Uint8Array): keyof typeof ERLAUBTE_BILDTYPEN | null {
  const gleich = (offset: number, ...bytes: number[]) =>
    bytes.every((v, i) => b[offset + i] === v);
  const ascii = (offset: number, s: string) =>
    [...s].every((c, i) => b[offset + i] === c.charCodeAt(0));

  if (gleich(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (gleich(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (ascii(0, "GIF8")) return "image/gif";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  if (ascii(4, "ftyp") && ascii(8, "avif")) return "image/avif";
  return null;
}

/**
 * Lädt ein Maschinenfoto hoch und gibt die öffentliche URL zurück.
 * Gibt null zurück, wenn keine Datei übergeben wurde.
 */
export async function uploadMachinePhoto(
  file: File | null,
  userId: string,
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  if (file.size > MAX_BYTES) {
    throw new Error("Bild zu groß (maximal 10 MB).");
  }

  const kopf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const typ = erkenneBildtyp(kopf);
  if (!typ) {
    throw new Error(
      "Nur Bilddateien werden akzeptiert (JPEG, PNG, WebP, GIF, AVIF).",
    );
  }

  const supabase = storageClient();
  // Endung und Content-Type aus dem ERKANNTEN Typ, nicht aus der Datei.
  const path = `${userId}/${crypto.randomUUID()}.${ERLAUBTE_BILDTYPEN[typ]}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: typ, upsert: false });

  if (error) {
    throw new Error(`Foto-Upload fehlgeschlagen: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
