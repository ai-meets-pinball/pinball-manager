"use server";

import { requireUser } from "@/lib/session";

/*
  Anbindung an die Open Pinball Database (OPDB, https://opdb.org/api).

  Zwei Server-Aktionen, aufrufbar aus dem Client-Formular:
  - searchOpdb():     Typeahead-Suche (öffentlich, kein Token nötig).
  - getOpdbMachine(): volle Maschinendaten zu einer OPDB-ID (braucht den Token).

  Der API-Token (OPDB_API_KEY) bleibt serverseitig — er verlässt diese Datei nie.
  requireUser() sorgt dafür, dass nur angemeldete Nutzer die OPDB abfragen.
*/

const OPDB_BASE = "https://opdb.org/api";

/** Ein Suchtreffer der Typeahead-Suche. `id` ist die OPDB-Referenz. */
export type OpdbSearchResult = {
  id: string;
  text: string; // z. B. "Godzilla (Premium) (Stern, 2021)"
};

/** In unser Datenmodell übersetzte Maschinendaten. */
export type OpdbMachine = {
  hersteller: string;
  modell: string;
  baujahr: number | null;
  opdbRef: string;
  ipdbRef: string | null;
  imageUrl: string | null; // primäres Bild von OPDB (img.opdb.org), oder null
};

type OpdbImage = {
  primary?: boolean;
  type?: string; // z. B. "backglass", "playfield"
  urls?: { small?: string; medium?: string; large?: string };
};

/** Wählt das aussagekräftigste Bild: bevorzugt das primäre Backglass, mittlere Größe. */
function pickImage(images?: OpdbImage[]): string | null {
  if (!images?.length) return null;
  const punkte = (img: OpdbImage) =>
    (img.primary ? 2 : 0) + (img.type === "backglass" ? 1 : 0);
  const best = [...images].sort((a, b) => punkte(b) - punkte(a))[0];
  return best.urls?.medium ?? best.urls?.large ?? best.urls?.small ?? null;
}

/** Typeahead-Suche nach Maschinen. Liefert höchstens ein paar Treffer. */
export async function searchOpdb(query: string): Promise<OpdbSearchResult[]> {
  await requireUser();
  const q = query.trim();
  if (q.length < 2) return [];

  const res = await fetch(
    `${OPDB_BASE}/search/typeahead?q=${encodeURIComponent(q)}`,
    { next: { revalidate: 86400 } }, // OPDB-Daten ändern sich selten → 1 Tag cachen
  );
  if (!res.ok) throw new Error(`OPDB-Suche fehlgeschlagen (${res.status})`);

  const data = (await res.json()) as { id: string; text: string }[];
  return data.map(({ id, text }) => ({ id, text }));
}

/** Holt die vollständigen Daten einer Maschine und übersetzt sie in unser Modell. */
export async function getOpdbMachine(opdbId: string): Promise<OpdbMachine> {
  await requireUser();
  const token = process.env.OPDB_API_KEY;
  if (!token) {
    // Häufigste Ursache in Produktion: OPDB_API_KEY nicht in den Env-Variablen.
    console.error("[opdb] getOpdbMachine: OPDB_API_KEY ist nicht gesetzt");
    throw new Error("OPDB_API_KEY ist nicht gesetzt");
  }

  const res = await fetch(
    `${OPDB_BASE}/machines/${encodeURIComponent(opdbId)}?api_token=${token}`,
    { next: { revalidate: 86400 } },
  );
  if (!res.ok) {
    console.error(
      `[opdb] getOpdbMachine ${opdbId}: HTTP ${res.status} ${res.statusText}`,
    );
    throw new Error(`OPDB-Abruf fehlgeschlagen (${res.status})`);
  }

  const d = (await res.json()) as {
    opdb_id?: string;
    name?: string;
    manufacture_date?: string; // "YYYY-MM-DD"
    ipdb_id?: number;
    manufacturer?: { name?: string };
    images?: OpdbImage[];
  };

  const jahr = d.manufacture_date ? Number(d.manufacture_date.slice(0, 4)) : NaN;

  return {
    hersteller: d.manufacturer?.name ?? "",
    modell: d.name ?? "",
    baujahr: Number.isFinite(jahr) ? jahr : null,
    opdbRef: d.opdb_id ?? opdbId,
    ipdbRef: d.ipdb_id != null ? String(d.ipdb_id) : null,
    imageUrl: pickImage(d.images),
  };
}
