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

/**
 * Lädt ein Maschinenfoto hoch und gibt die öffentliche URL zurück.
 * Gibt null zurück, wenn keine Datei übergeben wurde.
 */
export async function uploadMachinePhoto(
  file: File | null,
  userId: string,
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const supabase = storageClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    throw new Error(`Foto-Upload fehlgeschlagen: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
