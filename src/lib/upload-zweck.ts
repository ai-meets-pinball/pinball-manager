/*
  Uploads gehen direkt vom Browser in den Vercel-Blob-Speicher (Feedback Kai
  10/2026): Vercel nimmt pro Anfrage höchstens 4,5 MB an, ein Galeriefoto ist
  oft größer — durch das Formular kam die Datei gar nicht erst an.

  Ablauf: Der Browser fragt `/api/upload` nach einem Token (Berechtigung je
  Zweck), lädt die Datei direkt in den Blob und schickt mit dem Formular nur die
  URL. Beim Speichern prüft der Server die echten Bytes (lib/storage.ts).

  Diese Datei ist die reine Regel dazu: welche Zwecke es gibt (Ordner, Typen,
  Grenzen), welcher Pfad für ein Token erlaubt ist und welche zurückgereichten
  URLs der Server annimmt. Ohne Blob-SDK, ohne DB — client- und servertauglich.

  Logos (Club/Nutzer) sind bewusst KEIN Zweck: ein SVG läge bei einem
  Direkt-Upload ungeprüft öffentlich im Speicher, solange niemand abschickt.
  Logos laufen deshalb weiter durchs Formular (klein genug, siehe storage.ts).
*/

const MB = 1024 * 1024;

export const BILD_TYPEN = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

/** Dokument-Endung → Content-Type. Der Typ folgt der Endung, nicht dem, was
    der Browser meldet (CSV kommt unter Windows z. B. als Excel-Typ). */
const DOKUMENT_TYPEN: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
};

type Zweck = {
  ordner: string;
  typen: readonly string[];
  maxBytes: number;
  maxAnzahl: number;
  /** Dürfen Gäste (ohne Konto) hochladen? Nur beim Melden per QR-Code. */
  gast: boolean;
};

export const UPLOAD_ZWECKE = {
  fehlerfoto: { ordner: "fault-images/", typen: BILD_TYPEN, maxBytes: 10 * MB, maxAnzahl: 5, gast: true },
  maschinenfoto: { ordner: "machine-photos/", typen: BILD_TYPEN, maxBytes: 10 * MB, maxAnzahl: 1, gast: false },
  avatar: { ordner: "avatars/", typen: BILD_TYPEN, maxBytes: 10 * MB, maxAnzahl: 1, gast: false },
  feedback: { ordner: "feedback/", typen: BILD_TYPEN, maxBytes: 10 * MB, maxAnzahl: 1, gast: false },
  dokument: {
    ordner: "machine-docs/",
    typen: [...new Set(Object.values(DOKUMENT_TYPEN))],
    maxBytes: 25 * MB,
    maxAnzahl: 1,
    gast: false,
  },
} satisfies Record<string, Zweck>;

export type UploadZweck = keyof typeof UPLOAD_ZWECKE;

export function istUploadZweck(w: unknown): w is UploadZweck {
  return typeof w === "string" && Object.hasOwn(UPLOAD_ZWECKE, w);
}

/** Ordner eines Uploaders für einen Zweck. `uploader` = Nutzer-ID oder "gast". */
export function uploadPraefix(zweck: UploadZweck, uploader: string): string {
  return `${UPLOAD_ZWECKE[zweck].ordner}${uploader}/`;
}

/** Ein Dateiname: ein einziges Segment, keine Pfad-Tricks. */
const DATEINAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function unterPraefix(zweck: UploadZweck, uploader: string, pfad: string): boolean {
  const praefix = uploadPraefix(zweck, uploader);
  if (!pfad.startsWith(praefix)) return false;
  const rest = pfad.slice(praefix.length);
  return DATEINAME.test(rest) && !rest.includes("..");
}

/** Darf für diesen Pfad ein Upload-Token ausgestellt werden? */
export function pruefeUploadPfad(
  zweck: UploadZweck,
  uploader: string,
  pfad: string,
): boolean {
  if (uploader === "gast" && !UPLOAD_ZWECKE[zweck].gast) return false;
  return unterPraefix(zweck, uploader, pfad);
}

/*
  Prüft die mit dem Formular zurückgereichten URLs: nur Strings, nur https auf
  dem EIGENEN Store-Host, nur unter dem eigenen Ordner (ein Gast kann keine
  Konto-Uploads einreichen und umgekehrt), höchstens so viele, wie der Zweck
  erlaubt. Doppelte werden still entfernt.
*/
export function pruefeUploadUrls(
  zweck: UploadZweck,
  uploader: string,
  werte: unknown[],
  storeHost: string,
): { urls: string[] } | { error: string } {
  const fehler = { error: "Eine Datei konnte nicht zugeordnet werden. Bitte erneut auswählen." };
  const urls: string[] = [];
  for (const w of werte) {
    if (typeof w !== "string") return fehler;
    let u: URL;
    try {
      u = new URL(w);
    } catch {
      return fehler;
    }
    const pfad = decodeURIComponent(u.pathname.slice(1));
    if (
      u.protocol !== "https:" ||
      u.host !== storeHost ||
      !pruefeUploadPfad(zweck, uploader, pfad)
    ) {
      return fehler;
    }
    if (!urls.includes(w)) urls.push(w);
  }
  const max = UPLOAD_ZWECKE[zweck].maxAnzahl;
  if (urls.length > max) {
    return { error: max === 1 ? "Nur eine Datei." : `Höchstens ${max} Dateien.` };
  }
  return { urls };
}

/** Content-Type eines Dokuments aus seiner Endung — null, wenn nicht erlaubt. */
export function dokumentContentType(dateiname: string): string | null {
  const m = /\.([a-z0-9]+)$/i.exec(dateiname.trim());
  return m ? (DOKUMENT_TYPEN[m[1].toLowerCase()] ?? null) : null;
}
