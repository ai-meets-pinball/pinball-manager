import type {
  MAINTENANCE_INTERVALL_TYPEN,
  MAINTENANCE_PRIORITAETEN,
} from "@/lib/validators";

/*
  Standard-Wartungsplan als Code-Daten (wie DEFAULT_TEMPLATES in
  lib/email-templates.ts) — bewusst KEINE Katalog-Tabelle: die Liste ist eine
  feste, vom Code gelieferte Vorlage, die per „Standard übernehmen" in die
  per-Gerät-Wartungspunkte (maintenance_tasks) kopiert wird. Danach ist jeder
  Punkt frei editierbar.

  Quelle: Timms „Wartungspunkte_Flipper.xlsx". Die Intervall-Spalte ist teils
  zeit-, teils spielzahl-, teils bedarfsbasiert; nur ein echtes Zeitintervall
  („…/monatlich") ergibt eine Fälligkeit — die übrigen sind Checkliste
  (intervallTyp „spiele"/„bedarf", intervallTage null). Das Original-Label
  bleibt zur Anzeige in `intervallText`.
*/
export type MaintenanceCatalogEntry = {
  titel: string;
  kategorie: string;
  bauteil: string;
  taetigkeit: string;
  intervallText: string;
  intervallTyp: (typeof MAINTENANCE_INTERVALL_TYPEN)[number];
  intervallTage: number | null;
  prioritaet: (typeof MAINTENANCE_PRIORITAETEN)[number];
  beschreibung: string;
};

export const MAINTENANCE_STANDARD: MaintenanceCatalogEntry[] = [
  {
    titel: "Gummis kontrollieren",
    kategorie: "Verschleiß",
    bauteil: "Spielfeldgummis",
    taetigkeit: "Prüfen",
    intervallText: "500 Spiele / monatlich",
    intervallTyp: "zeit",
    intervallTage: 30,
    prioritaet: "mittel",
    beschreibung: "Sichtprüfung auf Risse, Verhärtung und Verschleiß",
  },
  {
    titel: "Flippergummis tauschen",
    kategorie: "Verschleiß",
    bauteil: "Flipperfinger",
    taetigkeit: "Ersetzen",
    intervallText: "Bei Verschleiß",
    intervallTyp: "bedarf",
    intervallTage: null,
    prioritaet: "hoch",
    beschreibung: "Alte Flippergummis gegen neue austauschen",
  },
  {
    titel: "Flipperfinger prüfen",
    kategorie: "Mechanik",
    bauteil: "Flipperfinger",
    taetigkeit: "Prüfen",
    intervallText: "1000 Spiele",
    intervallTyp: "spiele",
    intervallTage: null,
    prioritaet: "hoch",
    beschreibung: "Verschleiß, Spiel und Befestigung kontrollieren",
  },
  {
    titel: "Abschussgummi tauschen",
    kategorie: "Verschleiß",
    bauteil: "Shooter Rod",
    taetigkeit: "Ersetzen",
    intervallText: "Bei Verschleiß",
    intervallTyp: "bedarf",
    intervallTage: null,
    prioritaet: "mittel",
    beschreibung: "Abschussgummi ersetzen",
  },
  {
    titel: "Abschuss prüfen",
    kategorie: "Mechanik",
    bauteil: "Shooter",
    taetigkeit: "Prüfen",
    intervallText: "Wartung",
    intervallTyp: "bedarf",
    intervallTage: null,
    prioritaet: "mittel",
    beschreibung: "Funktion und Kraft des Abschusses kontrollieren",
  },
  {
    titel: "Schalter testen",
    kategorie: "Elektrik",
    bauteil: "Schalter",
    taetigkeit: "Testen",
    intervallText: "Wartung",
    intervallTyp: "bedarf",
    intervallTage: null,
    prioritaet: "hoch",
    beschreibung: "Alle relevanten Schalter auf Funktion prüfen",
  },
  {
    titel: "Spielfeld reinigen",
    kategorie: "Reinigung",
    bauteil: "Spielfeld",
    taetigkeit: "Reinigen",
    intervallText: "300–500 Spiele",
    intervallTyp: "spiele",
    intervallTage: null,
    prioritaet: "hoch",
    beschreibung: "Spielfeld gründlich reinigen",
  },
  {
    titel: "Kugeln tauschen",
    kategorie: "Verschleiß",
    bauteil: "Kugeln",
    taetigkeit: "Ersetzen",
    intervallText: "300–500 Spiele",
    intervallTyp: "spiele",
    intervallTage: null,
    prioritaet: "hoch",
    beschreibung: "Alte Kugeln gegen neue austauschen",
  },
  {
    titel: "Flippermechaniken inkl. EOS prüfen",
    kategorie: "Mechanik",
    bauteil: "Flipperbaugruppe",
    taetigkeit: "Prüfen",
    intervallText: "Wartung",
    intervallTyp: "bedarf",
    intervallTage: null,
    prioritaet: "sehr hoch",
    beschreibung: "Mechanik, End-of-Stroke-Schalter und Spiel kontrollieren",
  },
  {
    titel: "Flipperknopf-Schalter prüfen",
    kategorie: "Elektrik",
    bauteil: "Cabinet",
    taetigkeit: "Prüfen",
    intervallText: "Wartung",
    intervallTyp: "bedarf",
    intervallTage: null,
    prioritaet: "hoch",
    beschreibung: "Flipperbutton und Mikroschalter testen",
  },
  {
    titel: "Batterien tauschen",
    kategorie: "Elektronik",
    bauteil: "CPU-Board",
    taetigkeit: "Ersetzen",
    intervallText: "Nach Bedarf",
    intervallTyp: "bedarf",
    intervallTage: null,
    prioritaet: "kritisch",
    beschreibung: "Batterieschäden vermeiden",
  },
  {
    titel: "Beleuchtung testen",
    kategorie: "Beleuchtung",
    bauteil: "Lampen/LEDs",
    taetigkeit: "Testen",
    intervallText: "Wartung",
    intervallTyp: "bedarf",
    intervallTage: null,
    prioritaet: "niedrig",
    beschreibung: "Defekte Leuchtmittel identifizieren",
  },
];
