import { del, head, put } from "@vercel/blob";
import {
  BILD_TYPEN,
  pruefeUploadUrls,
  UPLOAD_ZWECKE,
  type UploadZweck,
} from "@/lib/upload-zweck";

/*
  Datei-Speicher: Vercel Blob (öffentlicher Store, Region Frankfurt). Supabase
  ist seit 10/2026 nur noch die Postgres-Datenbank.

  Zwei Wege hinein:
  1. DIREKT aus dem Browser (Fotos, Avatar, Screenshot, Dokumente): Token über
     /api/upload, Regeln in lib/upload-zweck.ts. Hier wird beim Speichern nur
     noch GEPRÜFT (uebernehmeUploads) — echte Bytes, Größe, eigener Store.
  2. DURCH DAS FORMULAR (nur Logos, klein): uploadClubLogo / uploadUserLogo.

  Der Token (BLOB_READ_WRITE_TOKEN) bleibt serverseitig; diese Datei darf nie
  aus Client-Code importiert werden.
*/

const ERLAUBTE_BILDTYPEN = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
} as const;

/*
  Host des eigenen Stores (öffentliche URLs) — so prüft der Server, dass eine
  zurückgereichte URL wirklich aus UNSEREM Speicher stammt. Die Store-ID setzt
  Vercel als BLOB_STORE_ID („store_<id>"); sonst steckt sie im Token
  (vercel_blob_rw_<id>_<geheim>).
*/
export function storeHost(): string {
  const storeId =
    process.env.BLOB_STORE_ID?.replace(/^store_/, "") ??
    (process.env.BLOB_READ_WRITE_TOKEN ?? "").split("_")[3];
  if (!storeId) throw new Error("BLOB_STORE_ID / BLOB_READ_WRITE_TOKEN fehlt.");
  return `${storeId.toLowerCase()}.public.blob.vercel-storage.com`;
}

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

/** Die ersten Bytes einer hochgeladenen Datei (für die Signatur-Prüfung). */
async function kopfBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { headers: { Range: "bytes=0-15" }, cache: "no-store" });
  if (!res.ok) throw new Error("Eine Datei ist nicht angekommen. Bitte erneut auswählen.");
  return new Uint8Array(await res.arrayBuffer()).slice(0, 16);
}

/*
  Prüft EINE direkt hochgeladene Datei: Größe und Typ laut Speicher (das Token
  hat beides schon begrenzt — hier die zweite Linie), dann die echten Bytes:
  ein Bild muss seine Signatur tragen, ein PDF %PDF, Office ein ZIP-Container.
  Reiner Text (txt/csv) hat keine Signatur; er wird als text/* ausgeliefert und
  ist damit im Browser nicht ausführbar.
*/
async function pruefeHochgeladen(zweck: UploadZweck, url: string): Promise<void> {
  const regel = UPLOAD_ZWECKE[zweck];
  const meta = await head(url);
  const typ = meta.contentType.split(";")[0].trim();
  if (meta.size > regel.maxBytes) {
    throw new Error(`Datei zu groß (maximal ${regel.maxBytes / 1024 / 1024} MB).`);
  }
  if (!(regel.typen as readonly string[]).includes(typ)) throw new Error("Dieser Dateityp ist hier nicht erlaubt.");
  if (typ.startsWith("text/")) return;

  const kopf = await kopfBytes(url);
  const passt = (BILD_TYPEN as readonly string[]).includes(typ)
    ? erkenneBildtyp(kopf) === typ
    : typ === "application/pdf"
      ? istPdf(kopf)
      : istZip(kopf); // docx/xlsx/pptx
  if (!passt) {
    throw new Error("Die Datei passt nicht zu ihrem Typ (beschädigt oder umbenannt?).");
  }
}

/*
  Übernimmt direkt hochgeladene Dateien beim Speichern eines Formulars:
  URLs prüfen (eigener Store, eigener Ordner, Anzahl — reine Regel), dann jede
  Datei (pruefeHochgeladen). Scheitert eine, werden ALLE dieses Aufrufs gelöscht
  und der Fehler geworfen — es entsteht kein Datensatz mit halben Dateien.
*/
export async function uebernehmeUploads(
  zweck: UploadZweck,
  uploader: string,
  werte: unknown[],
): Promise<string[]> {
  const geprueft = pruefeUploadUrls(zweck, uploader, werte, storeHost());
  if ("error" in geprueft) throw new Error(geprueft.error);
  try {
    for (const url of geprueft.urls) await pruefeHochgeladen(zweck, url);
  } catch (e) {
    if (geprueft.urls.length > 0) await del(geprueft.urls).catch(() => {});
    throw e;
  }
  return geprueft.urls;
}

/** Wie uebernehmeUploads für Felder mit EINER Datei; leer → null. */
export async function uebernehmeUpload(
  zweck: UploadZweck,
  uploader: string,
  wert: FormDataEntryValue | null,
): Promise<string | null> {
  if (wert === null || wert === "") return null;
  const [url] = await uebernehmeUploads(zweck, uploader, [wert]);
  return url ?? null;
}

/** Höchstzahl Fotos je Fehlermeldung (angemeldet wie Gast). */
export const MAX_FAULT_IMAGES = UPLOAD_ZWECKE.fehlerfoto.maxAnzahl;

/*
  Club-Logo: erlaubt sind JPG, PNG und SVG. SVG ist kein Magic-Byte-Format,
  sondern XML-Text und braucht einen eigenen Zweig. Aktive Inhalte (Skripte,
  Event-Handler) werden abgelehnt — zwar liefert der Storage von einer fremden
  Origin aus (kein Zugriff auf App-Cookies) und die App bindet Logos nur per
  <img> ein (führt nichts aus), aber ein Skript-SVG hat trotzdem nichts im
  öffentlichen Speicher verloren.
*/
const MAX_SVG_BYTES = 1 * 1024 * 1024; // 1 MB — Logos sind klein.

/*
  Prüft SVG-Text auf aktive/gefährliche Inhalte. Bleibt bewusst eine DENYLIST
  (ein vollständiger XML-Parser/Sanitizer wäre für ein Vereinslogo überzogen) —
  aber eine breite: Skripte, Event-Handler, externe/Skript-URLs, eingebettete
  Fremd-Dokumente, Animation von href/URL-Attributen, XML-Entities/DOCTYPE
  (XXE), CSS-@import und Meta-Refresh werden abgelehnt.

  Kontext-Einordnung: Das Logo liegt in einem Bucket auf FREMDER Origin
  (*.public.blob.vercel-storage.com) und wird in der App nur per <img> eingebunden (führt nichts
  aus). Ein Skript-SVG kann also keine App-Session stehlen; die Prüfung
  verhindert primär, dass der öffentliche Speicher aktive Inhalte unter der
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

/* Logos laufen durchs Formular (nicht direkt): ein SVG wird VOR dem Speichern
   geprüft und liegt nie ungeprüft im öffentlichen Store. Raster-Logos sind auf
   4 MB begrenzt, damit die Anfrage unter Vercels 4,5-MB-Grenze bleibt. */
const MAX_LOGO_BYTES = 4 * 1024 * 1024;

/* Generischer Logo-Upload (JPG/PNG/SVG) in einen Ordner — Kern für Club- UND
   Nutzer-Logos. JPG/PNG per Magic Bytes; SVG als Text mit svgVerletzung-Prüfung. */
async function uploadLogo(
  file: File | null,
  ordner: string,
  userId: string,
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const kopf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const rasterTyp = erkenneBildtyp(kopf);
  if (rasterTyp === "image/jpeg" || rasterTyp === "image/png") {
    if (file.size > MAX_LOGO_BYTES) throw new Error("Logo zu groß (maximal 4 MB).");
    const blob = await put(
      `${ordner}${userId}/${crypto.randomUUID()}.${ERLAUBTE_BILDTYPEN[rasterTyp]}`,
      file,
      { access: "public", contentType: rasterTyp },
    );
    return blob.url;
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
  const blob = await put(`${ordner}${userId}/${crypto.randomUUID()}.svg`, text, {
    access: "public",
    contentType: "image/svg+xml",
  });
  return blob.url;
}

/** Prüft die ersten Bytes auf PDF- bzw. ZIP-Signatur (Office = ZIP-Container). */
export function istPdf(b: Uint8Array): boolean {
  return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // %PDF
}
function istZip(b: Uint8Array): boolean {
  return b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04; // PK\x03\x04
}

/*
  Löscht eine Datei anhand ihrer öffentlichen URL — der EINZIGE Ort im Projekt,
  der aktiv aus dem Speicher löscht (Fotos/Logos bleiben bewusst liegen;
  Dokumente sollen beim Löschen wirklich verschwinden). Nur URLs des EIGENEN
  Stores; fremde (OPDB, externe Links) werden still übersprungen. Best-effort:
  schlägt es fehl, wird nur geloggt — das Löschen der Datenbankzeile darf daran
  nicht scheitern.
*/
export async function deleteStorageObject(url: string | null): Promise<void> {
  if (!url) return;
  try {
    if (new URL(url).host !== storeHost()) return;
    await del(url);
  } catch (e) {
    console.error("Speicher-Löschen fehlgeschlagen:", e);
  }
}

/** Club-Logo hochladen (JPG/PNG bis 4 MB, SVG bis 1 MB mit Aktiv-Inhalts-Prüfung). */
export async function uploadClubLogo(
  file: File | null,
  userId: string,
): Promise<string | null> {
  return uploadLogo(file, "club-logos/", userId);
}

/** Nutzer-Logo (Sammel-QR) hochladen — gleiche Regeln wie das Club-Logo. */
export async function uploadUserLogo(
  file: File | null,
  userId: string,
): Promise<string | null> {
  return uploadLogo(file, "user-logos/", userId);
}
