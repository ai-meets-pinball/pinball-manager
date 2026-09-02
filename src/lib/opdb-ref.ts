/*
  OPDB-Referenzen zerlegen — und die FAMILIE bestimmen.

  OPDB kennt drei Ebenen (Beispiel Pokémon, Stern):
    Gruppe / Titel    GV8wB              — alle Editionen zusammen (Pro, Premium, LE)
    Maschine/Edition  GV8wB-MRjKd        — Premium/LE (Spulen-/Schaltermatrix)
    Alias             GV8wB-MRjKd-ARz2r  — die LE als eigener Katalogeintrag

  Regel des Produkts: nur die ersten ZWEI Segmente sind technisch relevant. Alle
  Katalogzeilen mit gleichem Familienschlüssel sind BAUGLEICH (Editionen
  derselben Maschine) und teilen ihr Wissen — die Zeilen selbst bleiben getrennt,
  denn die OPDB-Referenzen sind vorgegeben und werden nicht verändert.
  GV8wB-Mq12N (Pro) hat ein anderes zweites Segment und ist NICHT baugleich.

  Bewusst eine eigene, REINE Datei (kein "use server", kein DB): der Parser wird
  in Server-Actions synchron gebraucht, die Familienregel von UI, Actions und
  dem SQL-Backfill (split_part) gleich verstanden — darum sind leere Segmente
  hier genauso ungültig wie dort.
*/

export type OpdbRefTeile = {
  /** Die getrimmte Referenz, wie sie gespeichert wird. */
  ref: string;
  /** Erster Abschnitt = Gruppe/Titel (z. B. "GV8wB"). */
  groupRef: string;
  /** Gruppe + Maschine (z. B. "GV8wB-MRjKd") — der Familienschlüssel. */
  machineRef: string | null;
  /** true, wenn die Referenz NUR eine Gruppe ist (keine Maschine). */
  istGruppe: boolean;
  /** true bei drei oder mehr Segmenten (Alias/Edition einer Maschine). */
  istAlias: boolean;
};

/** Zerlegt eine OPDB-Referenz. Liefert null bei leerer/ungültiger Eingabe. */
export function parseOpdbRef(ref: string | null | undefined): OpdbRefTeile | null {
  const s = ref?.trim();
  if (!s) return null;

  const teile = s.split("-");
  const groupRef = teile[0];
  if (!groupRef) return null;
  const maschine = teile[1];

  return {
    ref: s,
    groupRef,
    machineRef: maschine ? `${groupRef}-${maschine}` : null,
    istGruppe: teile.length === 1,
    istAlias: teile.length >= 3 && Boolean(maschine),
  };
}

/** Familienschlüssel (erste zwei Segmente) — null für Gruppen-/kaputte Referenzen. */
export function familienSchluessel(ref: string | null | undefined): string | null {
  return parseOpdbRef(ref)?.machineRef ?? null;
}

/** Sind zwei Referenzen baugleich (gleiche Familie)? Ohne Schlüssel nie. */
export function istBaugleich(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const ka = familienSchluessel(a);
  const kb = familienSchluessel(b);
  return ka !== null && kb !== null && ka === kb;
}

type FamilienZeile = { id: string; opdbRef: string; modell: string };

/**
 * Der Vertreter einer Familie für Listen, die je Familie EINEN Eintrag zeigen:
 * die editionsneutrale zweisegmentige Zeile („Pokémon (Premium/LE)"), sonst die
 * mit dem kürzesten Namen; Gleichstand entscheidet die Referenz (deterministisch).
 */
export function familienVertreter<T extends Omit<FamilienZeile, "id">>(rows: T[]): T {
  const zwei = rows.find((r) => parseOpdbRef(r.opdbRef)?.istAlias === false);
  if (zwei) return zwei;
  return [...rows].sort(
    (a, b) =>
      a.modell.length - b.modell.length || a.opdbRef.localeCompare(b.opdbRef),
  )[0];
}

/**
 * Zeilen nach Familie bündeln. Zeilen ohne Schlüssel bilden je eine eigene
 * Familie. Reihenfolge: nach Vertreter-Name, dann Referenz.
 */
export function gruppiereNachFamilie<T extends FamilienZeile>(
  rows: T[],
): { schluessel: string; vertreter: T; mitglieder: T[] }[] {
  const karte = new Map<string, T[]>();
  for (const r of rows) {
    const k = familienSchluessel(r.opdbRef) ?? `id:${r.id}`;
    karte.set(k, [...(karte.get(k) ?? []), r]);
  }
  return [...karte.entries()]
    .map(([schluessel, mitglieder]) => ({
      schluessel,
      vertreter: familienVertreter(mitglieder),
      mitglieder,
    }))
    .sort(
      (a, b) =>
        a.vertreter.modell.localeCompare(b.vertreter.modell, "de") ||
        a.vertreter.opdbRef.localeCompare(b.vertreter.opdbRef),
    );
}
