/*
  Anzeigenamen der Fehler-Status (Werte wie in validators.ts `faultSchema`:
  offen, quittiert, in Arbeit, behoben) — damit Filter-Pillen und Auswahlfelder
  nie den rohen Wert zeigen (P7). „alle" ist kein Status, sondern der Filter
  „kein Filter" der Fehlerliste; er steht deshalb nur in FEHLER_FILTER.
*/
export const FEHLER_STATUS = ["offen", "quittiert", "in Arbeit", "behoben"] as const;
export type FehlerStatus = (typeof FEHLER_STATUS)[number];

export const FEHLER_STATUS_LABEL: Record<FehlerStatus, string> = {
  offen: "Offen",
  quittiert: "Quittiert",
  "in Arbeit": "In Arbeit",
  behoben: "Behoben",
};

export const FEHLER_FILTER = ["alle", ...FEHLER_STATUS] as const;
export type FehlerFilter = (typeof FEHLER_FILTER)[number];

export const FEHLER_FILTER_LABEL: Record<FehlerFilter, string> = {
  alle: "Alle",
  ...FEHLER_STATUS_LABEL,
};

/** Status einer Reparatur (Werte wie in validators.ts `repairSchema`). */
export type ReparaturStatus = "offen" | "in Arbeit" | "erledigt";

/*
  Eine Reparatur führt den Status ihrer verknüpften Fehler (Feedback 09/2026):
  „erledigt" → behoben; „in Arbeit" → in Arbeit, aber nur für Fehler, die noch
  nicht behoben sind (ein behobener Fehler wird nicht wieder aufgemacht — dafür
  ist das Fehler-Formular da). „offen" lässt die Fehler in Ruhe.
  Liefert den neuen Fehlerstatus oder null, wenn nichts zu ändern ist.
*/
export function fehlerStatusNachReparatur(
  reparatur: ReparaturStatus,
  fehler: FehlerStatus,
): FehlerStatus | null {
  if (reparatur === "erledigt") return fehler === "behoben" ? null : "behoben";
  if (reparatur === "in Arbeit") {
    return fehler === "offen" || fehler === "quittiert" ? "in Arbeit" : null;
  }
  return null;
}
