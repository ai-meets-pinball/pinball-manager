import { FACT_COLUMNS } from "@/lib/validators";
import type { TroubleshootingGuide } from "@/lib/validators";

/*
  Beispiel-Inhalte für die Vorschau in leeren Reitern (Handbuch, Guide): so
  sieht es aus, wenn Daten da sind. Frei erfunden, aber in der Form exakt wie
  echte Einträge (extractSchema bzw. troubleshootingGuideSchema) — die
  Vorschau nutzt dieselben Anzeige-Komponenten wie die echten Daten, damit
  sie nicht lügt. Rein: keine Abhängigkeit zu DB oder React.
*/

/** Drei kleine Tabellen: Spulen, Schalter-Matrix (rendert als Raster), Sicherungen. */
export const BEISPIEL_FAKTEN = {
  coils: {
    columns: FACT_COLUMNS.coils,
    rows: [
      ["01", "Trough Eject", "23-800", "Q80", "VIO-BRN", "Power Driver"],
      ["02", "Auto Plunger", "23-800", "Q78", "VIO-RED", "Power Driver"],
      ["03", "Left Slingshot", "26-1200", "Q76", "VIO-ORN", "Power Driver"],
      ["04", "Right Slingshot", "26-1200", "Q74", "VIO-YEL", "Power Driver"],
      ["09", "Left Flipper", "FL-11629", "Q66", "BLU-VIO", "Fliptronic"],
      ["10", "Right Flipper", "FL-11629", "Q64", "BLU-GRY", "Fliptronic"],
    ],
  },
  switches: {
    columns: FACT_COLUMNS.switches,
    rows: [
      ["11", "1", "1", "mechanisch", "Launch Button"],
      ["12", "1", "2", "mechanisch", "Plumb Bob Tilt"],
      ["13", "1", "3", "opto", "Trough 1"],
      ["14", "1", "4", "opto", "Trough 2"],
      ["21", "2", "1", "mechanisch", "Left Slingshot"],
      ["22", "2", "2", "mechanisch", "Right Slingshot"],
      ["23", "2", "3", "mechanisch", "Left Inlane"],
      ["24", "2", "4", "mechanisch", "Right Inlane"],
      ["31", "3", "1", "opto", "Left Ramp Enter"],
      ["32", "3", "2", "opto", "Right Ramp Enter"],
    ],
  },
  fuses: {
    columns: FACT_COLUMNS.fuses,
    rows: [
      ["Power Driver", "F101", "3A SB", "Solenoide 50 V"],
      ["Power Driver", "F106", "5A SB", "Flipper 50 V"],
      ["Power Driver", "F114", "3A SB", "Lampenmatrix 18 V"],
      ["CPU", "F901", "0,5A", "Batterie/Logik 5 V"],
    ],
  },
};

/** Ein kurzer Guide mit den drei Block-Typen (Text, Warnung, Tabelle). */
export const BEISPIEL_GUIDE: TroubleshootingGuide = {
  plattform: "WPC-95 (Williams/Bally, 1995–1999)",
  abschnitte: [
    {
      titel: "1 · Sicherheit zuerst",
      bloecke: [
        {
          typ: "warnung",
          text: "Netzstecker ziehen, bevor du an Netzteil oder Fliptronic-Board arbeitest — der 50-V-Zweig bleibt über die Elkos kurz geladen.",
        },
        {
          typ: "text",
          text: "Vor jeder Fehlersuche: Sicherungen sichtprüfen, Stecker auf den Boards nachdrücken, Batteriefach auf Korrosion ansehen.",
        },
      ],
    },
    {
      titel: "2 · Flipper schwach oder tot",
      bloecke: [
        {
          typ: "text",
          text: "Beide Flipper tot → Sicherung F106 und das Fliptronic-II-Board prüfen. Nur einer tot → EOS-Schalter und den Flipperschalter am Knopf messen.",
        },
        {
          typ: "tabelle",
          titel: "Schnelldiagnose",
          spalten: ["Symptom", "Verdacht", "Prüfen"],
          zeilen: [
            ["Beide Flipper tot", "F106 durch", "Sicherung, dann 50 V am J907"],
            ["Ein Flipper schwach", "EOS-Kontakt verbrannt", "Kontakt reinigen/erneuern"],
            ["Flipper bleibt oben", "Transistor durchlegiert", "Q am Fliptronic tauschen"],
          ],
        },
      ],
    },
    {
      titel: "3 · Bekannte Serienfehler",
      bloecke: [
        {
          typ: "text",
          text: "Batterie-Korrosion auf dem CPU-Board und gebrochene Lötstellen am Stecker J101 (Netzteil) sind die Klassiker dieser Generation.",
        },
      ],
    },
  ],
  quellen: ["PinWiki: WPC Repair Guide", "IPDB", "Pinside-Forum"],
};
