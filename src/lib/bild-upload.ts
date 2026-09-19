/*
  Was ein Bild-Upload darf — EINE Quelle für die Server-Prüfung (lib/storage.ts,
  Magic Bytes + Größe) und für das, was das Formular vorab sagt und prüft
  (machine-form.tsx). Bewusst ohne Supabase-Import: storage.ts trägt den
  Service-Key und darf nie in Client-Code landen, diese Datei schon.
*/
export const MAX_BILD_MB = 10;

/** `accept` für das Dateifeld — dieselben Typen, die storage.ts annimmt. */
export const BILD_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/avif";

/** Hinweis am Foto-Feld: Formate, Grenze und welches Format gut passt —
    die Rahmen in Listen sind quadratisch, der Detail-Kopf 5:3. */
export const BILD_HINWEIS = `JPG, PNG, WebP, GIF oder AVIF, max. ${MAX_BILD_MB} MB. Am besten ein Querformat (etwa 5:3) vom ganzen Gerät oder vom Backglass — Hochkant-Fotos werden in Listen zugeschnitten.`;
