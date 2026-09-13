import { parseOpdbRef } from "@/lib/opdb-ref";

/*
  Die Ziel-Auswahl eines Tipps in Stufen ordnen — vom Nahen zum Fernen:
  1. dieses Gerät (sein Modell, vorausgewählt),
  2. weitere Editionen desselben Titels (gleiche OPDB-Gruppe, andere Familie —
     z. B. Pro ↔ Premium/LE; baugleiche Editionen sind schon EIN Eintrag),
  3. alle anderen Modelle.
  Generationen kommen getrennt davon (eigene Stufe im Formular).

  Rein: keine DB, kein React — das Formular zeigt nur, was hier sortiert wird.
*/
export type TippZiel = {
  id: string;
  label: string;
  opdbRef: string | null;
};

export function ordneTippZiele<T extends TippZiel>(
  modelle: T[],
  eigenes: { id: string; opdbRef: string | null },
): { eigenes: T | null; editionen: T[]; andere: T[] } {
  const gruppe = parseOpdbRef(eigenes.opdbRef)?.groupRef ?? null;
  let eigen: T | null = null;
  const editionen: T[] = [];
  const andere: T[] = [];
  for (const m of modelle) {
    if (m.id === eigenes.id) {
      eigen = m;
      continue;
    }
    const g = parseOpdbRef(m.opdbRef)?.groupRef ?? null;
    if (gruppe && g === gruppe) editionen.push(m);
    else andere.push(m);
  }
  return { eigenes: eigen, editionen, andere };
}
