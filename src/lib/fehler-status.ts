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
