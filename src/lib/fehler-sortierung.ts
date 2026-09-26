/*
  Sortierung offener Fehler auf der Übersicht — reine Regel (kein React, kein
  DB). Zwei Reihenfolgen: nach Priorität (kritisch zuerst, innerhalb die
  neuesten oben) oder schlicht die neuesten zuerst. Feedback 09/2026.
*/
export const FEHLER_SORTIERUNGEN = ["prioritaet", "neueste"] as const;
export type FehlerSortierung = (typeof FEHLER_SORTIERUNGEN)[number];

export const FEHLER_SORTIERUNG_LABEL: Record<FehlerSortierung, string> = {
  prioritaet: "Priorität",
  neueste: "Neueste",
};

/** Rang je Priorität (Reihenfolge des Enums fault_prioritaet, umgekehrt);
    unbekannte Werte landen hinten. */
export const PRIORITAET_RANG: Record<string, number> = {
  kritisch: 0,
  hoch: 1,
  mittel: 2,
  niedrig: 3,
};

export function fehlerSortierungAusParam(
  wert: string | undefined | null,
): FehlerSortierung {
  return (FEHLER_SORTIERUNGEN as readonly string[]).includes(wert ?? "")
    ? (wert as FehlerSortierung)
    : "prioritaet";
}

export function sortiereFehler<T extends { prioritaet: string; datum: Date }>(
  fehler: readonly T[],
  sortierung: FehlerSortierung,
): T[] {
  const rang = (f: T) => PRIORITAET_RANG[f.prioritaet] ?? 99;
  return [...fehler].sort((a, b) =>
    sortierung === "prioritaet" && rang(a) !== rang(b)
      ? rang(a) - rang(b)
      : b.datum.getTime() - a.datum.getTime(),
  );
}
