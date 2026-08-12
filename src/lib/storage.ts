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
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
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
  if (gleich(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))
    return "image/png";
  if (ascii(0, "GIF8")) return "image/gif";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  if (ascii(4, "ftyp") && ascii(8, "avif")) return "image/avif";
  return null;
}

/** Gemeinsamer Upload-Kern: prüfen (Größe + echte Bytes), hochladen,
    öffentliche URL zurückgeben. `ordner` trennt die Anwendungsfälle im Bucket. */
async function uploadBild(
  file: File,
  ordner: string,
  userId: string,
): Promise<string> {
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
  const path = `${ordner}${userId}/${crypto.randomUUID()}.${ERLAUBTE_BILDTYPEN[typ]}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: typ, upsert: false });

  if (error) {
    throw new Error(`Foto-Upload fehlgeschlagen: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
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
  return uploadBild(file, "", userId);
}

/** Lädt ein Profilbild (Avatar) hoch — eigener Ordner im selben Bucket. */
export async function uploadAvatar(
  file: File | null,
  userId: string,
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  return uploadBild(file, "avatars/", userId);
}

/** Optionaler Screenshot zu einer Feedback-Meldung (eigener Ordner). */
export async function uploadFeedbackScreenshot(
  file: File | null,
  userId: string,
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  return uploadBild(file, "feedback/", userId);
}

/*
  Club-Logo: erlaubt sind JPG, PNG und SVG. SVG ist kein Magic-Byte-Format,
  sondern XML-Text und braucht einen eigenen Zweig. Aktive Inhalte (Skripte,
  Event-Handler) werden abgelehnt — zwar liefert der Storage von einer fremden
  Origin aus (kein Zugriff auf App-Cookies) und die App bindet Logos nur per
  <img> ein (führt nichts aus), aber ein Skript-SVG hat trotzdem nichts im
  öffentlichen Bucket verloren.
*/
const MAX_SVG_BYTES = 1 * 1024 * 1024; // 1 MB — Logos sind klein.

/*
  Prüft SVG-Text auf aktive/gefährliche Inhalte. Bleibt bewusst eine DENYLIST
  (ein vollständiger XML-Parser/Sanitizer wäre für ein Vereinslogo überzogen) —
  aber eine breite: Skripte, Event-Handler, externe/Skript-URLs, eingebettete
  Fremd-Dokumente, Animation von href/URL-Attributen, XML-Entities/DOCTYPE
  (XXE), CSS-@import und Meta-Refresh werden abgelehnt.

  Kontext-Einordnung: Das Logo liegt in einem Bucket auf FREMDER Origin
  (*.supabase.co) und wird in der App nur per <img> eingebunden (führt nichts
  aus). Ein Skript-SVG kann also keine App-Session stehlen; die Prüfung
  verhindert primär, dass der öffentliche Bucket aktive Inhalte unter der
  Projekt-Domain hostet. Gibt bei einem Treffer das verletzte Muster zurück
  (für die Fehlermeldung), sonst null.

  Exportiert, damit die Regel direkt testbar ist (storage.test.ts).
*/
const SVG_VERBOTEN: readonly RegExp[] = [
  /<script[\s/>]/i,
  /<foreignobject[\s/>]/i,
  /<(iframe|embed|object|audio|video|link|meta)[\s/>]/i,
  /<use\b[^>]*\bhref/i, // <use href=…> / xlink:href
  /<(animate|animatetransform|animatemotion|set)\b/i, // kann href/URL animieren
  /<!doctype/i,
  /<!entity/i,
  /<!\[cdata\[/i, // maskiert oft Payloads
  /javascript:/i,
  /\bdata:\s*text\/html/i,
  /\son\w+\s*=/i, // onload=, onerror=, …
  /@import/i,
];

export function svgVerletzung(text: string): RegExp | null {
  return SVG_VERBOTEN.find((re) => re.test(text)) ?? null;
}

export async function uploadClubLogo(
  file: File | null,
  userId: string,
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  // Raster-Zweig: nur JPG/PNG (per Magic Bytes erkannt).
  const kopf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const rasterTyp = erkenneBildtyp(kopf);
  if (rasterTyp === "image/jpeg" || rasterTyp === "image/png") {
    return uploadBild(file, "club-logos/", userId);
  }

  // SVG-Zweig: als Text prüfen, dann mit festem Content-Type hochladen.
  if (file.size > MAX_SVG_BYTES) {
    throw new Error("Logo (SVG) zu groß (maximal 1 MB).");
  }
  const text = await file.text();
  if (!/<svg[\s>]/i.test(text)) {
    throw new Error("Als Logo sind JPG, PNG und SVG möglich.");
  }
  if (svgVerletzung(text)) {
    throw new Error(
      "SVG mit aktiven Inhalten (Skripte, Handler, externe Verweise) ist nicht erlaubt.",
    );
  }

  const supabase = storageClient();
  const path = `club-logos/${userId}/${crypto.randomUUID()}.svg`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, new Blob([text], { type: "image/svg+xml" }), {
      contentType: "image/svg+xml",
      upsert: false,
    });
  if (error) {
    throw new Error(`Logo-Upload fehlgeschlagen: ${error.message}`);
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
