/*
  Einheitliche Icon-Größen. Vorher lagen 15 verschiedene Literale im Umlauf
  (13/14/15/16/17/18 … für denselben Zweck). Konvention:
    sm = 14  — dichte Inline-Aktionen (Listenzeilen, Meta)
    md = 16  — Standard (Buttons, Nav, Felder)
    lg = 18  — größere Flächen (Summary/Disclosure, Karten-Icons)
  Schrittweise anwenden; Bestand wird nicht in einem Rutsch umgeschrieben.
*/
export const ICON = { sm: 14, md: 16, lg: 18 } as const;
