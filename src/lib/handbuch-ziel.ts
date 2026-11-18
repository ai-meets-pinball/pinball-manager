/*
  Wohin schreiben Handbuch-Fakten? Eingestiegen wird an einer Maschine ODER
  direkt am Modell (Wissensbasis, ohne eigene Maschine). Der Eintrag hängt am
  MODELL, wenn eines bekannt ist — sonst an der Maschine (Maschine ohne
  Katalog-Modell). Reine Regel, ohne DB.
*/
export type HandbuchZiel = {
  machineId: string | null;
  modelId: string | null;
  hersteller: string;
  modell: string;
};

/** Wo im UI eingestiegen wurde — wählt Route bzw. Formularfeld. */
export type HandbuchEinstieg = { art: "maschine" | "modell"; id: string };

export function wissensEbene(
  ziel: Pick<HandbuchZiel, "machineId" | "modelId">,
): { art: "modell"; modelId: string } | { art: "maschine"; machineId: string } {
  if (ziel.modelId) return { art: "modell", modelId: ziel.modelId };
  if (ziel.machineId) return { art: "maschine", machineId: ziel.machineId };
  throw new Error("Handbuch-Ziel ohne Modell und ohne Maschine.");
}
