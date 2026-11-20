import { UPLOAD_ZWECKE } from "@/lib/upload-zweck";

/*
  Verwaiste Direkt-Uploads: der Browser lädt ein Foto/Dokument schon bei der
  Auswahl in den Blob-Speicher (lib/upload-zweck.ts) — wird das Formular nie
  abgeschickt, bleibt die Datei liegen, ohne dass eine Zeile auf sie zeigt.
  Dasselbe gilt für Dateien gelöschter Fehler/Maschinen. Reine Regel, ohne DB
  und ohne Speicher: welche Blobs darf der tägliche Aufräum-Job löschen?

  Drei Bedingungen, alle müssen gelten:
  - liegt in einem DIREKT-Upload-Ordner (Logos gehen durchs Formular und sind
    nie verwaist — die bleiben unangetastet),
  - ist älter als die Schonfrist (wer gerade ein Formular ausfüllt, hat seine
    Datei schon hochgeladen, aber noch nicht gespeichert),
  - keine Zeile der Datenbank verweist auf die URL.
*/
export const SCHONFRIST_MS = 24 * 60 * 60 * 1000;

export const AUFRAEUM_ORDNER: readonly string[] = Object.values(UPLOAD_ZWECKE).map(
  (z) => z.ordner,
);

export type GespeicherterBlob = { url: string; pathname: string; uploadedAt: Date };

export function verwaisteBlobs(
  blobs: readonly GespeicherterBlob[],
  referenziert: ReadonlySet<string>,
  jetzt: Date,
): GespeicherterBlob[] {
  const grenze = jetzt.getTime() - SCHONFRIST_MS;
  return blobs.filter(
    (b) =>
      AUFRAEUM_ORDNER.some((o) => b.pathname.startsWith(o)) &&
      b.uploadedAt.getTime() < grenze &&
      !referenziert.has(b.url),
  );
}
