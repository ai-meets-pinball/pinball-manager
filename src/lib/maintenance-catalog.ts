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

  Quellen: Timms „Wartungspunkte_Flipper.xlsx" + Community-Standardwissen
  (PinWiki/Pinside). Nur ZEIT-Intervalle erzeugen Fälligkeiten (Erinnerungen,
  Dashboard); da es kein Spielzähler-Tracking gibt, tragen spielzahlbasierte
  Empfehlungen ein pragmatisches Kalender-Intervall für Heim-/Club-Betrieb —
  die Original-Empfehlung bleibt sichtbar in `intervallText`. Reine
  Ersetz-bei-Verschleiß-Punkte bleiben „bedarf" (Checkliste ohne Termin).

  WICHTIG: applyStandardMaintenance (db/actions/maintenance.ts) überspringt
  Duplikate NACH TITEL. Maschinen mit dem alten Standard bekommen beim erneuten
  Übernehmen nur NEUE Punkte; bereits kopierte behalten ihre (editierbaren)
  Intervalle — gewollt, die Kopien gehören dem Nutzer.
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
  /* ── Verschleiß ─────────────────────────────────────────────────────────── */
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
    titel: "Kugeln tauschen",
    kategorie: "Verschleiß",
    bauteil: "Kugeln",
    taetigkeit: "Ersetzen",
    intervallText: "300–500 Spiele / halbjährlich",
    intervallTyp: "zeit",
    intervallTage: 180,
    prioritaet: "hoch",
    beschreibung:
      "Alte Kugeln austauschen — zerkratzte Kugeln ruinieren das Spielfeld",
  },
  /* ── Mechanik ──────────────────────────────────────────────────────────── */
  {
    titel: "Flipperfinger prüfen",
    kategorie: "Mechanik",
    bauteil: "Flipperfinger",
    taetigkeit: "Prüfen",
    intervallText: "1000 Spiele / vierteljährlich",
    intervallTyp: "zeit",
    intervallTage: 90,
    prioritaet: "hoch",
    beschreibung: "Verschleiß, Spiel und Befestigung kontrollieren",
  },
  {
    titel: "Flippermechaniken inkl. EOS prüfen",
    kategorie: "Mechanik",
    bauteil: "Flipperbaugruppe",
    taetigkeit: "Prüfen",
    intervallText: "Jährlich",
    intervallTyp: "zeit",
    intervallTage: 365,
    prioritaet: "sehr hoch",
    beschreibung: "Mechanik, End-of-Stroke-Schalter und Spiel kontrollieren",
  },
  {
    titel: "Pop-Bumper & Slingshots prüfen",
    kategorie: "Mechanik",
    bauteil: "Pop-Bumper / Slingshots",
    taetigkeit: "Prüfen",
    intervallText: "Halbjährlich",
    intervallTyp: "zeit",
    intervallTage: 180,
    prioritaet: "mittel",
    beschreibung: "Gummis, Schalterabstände und Kicker-Mechanik kontrollieren",
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
    titel: "Coil Stops & Spulenhülsen prüfen",
    kategorie: "Mechanik",
    bauteil: "Spulen",
    taetigkeit: "Prüfen",
    intervallText: "Bei trägen/schwachen Flippern",
    intervallTyp: "bedarf",
    intervallTage: null,
    prioritaet: "mittel",
    beschreibung:
      "Coil Stops auf Ausbröseln, Hülsen auf Verschleiß prüfen (träge Flipper)",
  },
  {
    titel: "Neigung/Pitch kontrollieren",
    kategorie: "Mechanik",
    bauteil: "Aufstellung",
    taetigkeit: "Prüfen",
    intervallText: "Nach jedem Transport / bei Bedarf",
    intervallTyp: "bedarf",
    intervallTage: null,
    prioritaet: "niedrig",
    beschreibung:
      "Neigung (ca. 6,5°) und seitliche Waage mit Wasserwaage kontrollieren",
  },
  {
    titel: "Cabinet-/Beinschrauben nachziehen",
    kategorie: "Mechanik",
    bauteil: "Cabinet",
    taetigkeit: "Prüfen",
    intervallText: "Jährlich",
    intervallTyp: "zeit",
    intervallTage: 365,
    prioritaet: "niedrig",
    beschreibung: "Bein-, Kopf- und Cabinetschrauben auf festen Sitz prüfen",
  },
  /* ── Elektrik / Elektronik ─────────────────────────────────────────────── */
  {
    titel: "Schalter testen",
    kategorie: "Elektrik",
    bauteil: "Schalter",
    taetigkeit: "Testen",
    intervallText: "Halbjährlich (Testmodus)",
    intervallTyp: "zeit",
    intervallTage: 180,
    prioritaet: "hoch",
    beschreibung: "Alle relevanten Schalter im Testmodus auf Funktion prüfen",
  },
  {
    titel: "Flipperknopf-Schalter prüfen",
    kategorie: "Elektrik",
    bauteil: "Cabinet",
    taetigkeit: "Prüfen",
    intervallText: "Jährlich",
    intervallTyp: "zeit",
    intervallTage: 365,
    prioritaet: "hoch",
    beschreibung: "Flipperbutton und Mikroschalter testen",
  },
  {
    titel: "Sicherungen sichten + Ersatz vorrätig",
    kategorie: "Elektrik",
    bauteil: "Sicherungen",
    taetigkeit: "Prüfen",
    intervallText: "Jährlich",
    intervallTyp: "zeit",
    intervallTage: 365,
    prioritaet: "mittel",
    beschreibung:
      "Sicherungen sichten (nur korrekte Werte!) und Ersatz-Sortiment auffüllen",
  },
  {
    titel: "Batterien tauschen",
    kategorie: "Elektronik",
    bauteil: "CPU-Board",
    taetigkeit: "Ersetzen",
    intervallText: "Jährlich — Auslaufschäden vermeiden",
    intervallTyp: "zeit",
    intervallTage: 365,
    prioritaet: "kritisch",
    beschreibung:
      "Batterien jährlich tauschen — ausgelaufene Zellen zerstören das CPU-Board",
  },
  {
    titel: "Steckverbinder/Kabelbaum prüfen",
    kategorie: "Elektronik",
    bauteil: "Kabelbaum",
    taetigkeit: "Prüfen",
    intervallText: "Jährlich",
    intervallTyp: "zeit",
    intervallTage: 365,
    prioritaet: "hoch",
    beschreibung:
      "GI- und Netzteil-Stecker auf Hitzeschäden/Verfärbung prüfen (Brandgefahr)",
  },
  /* ── Reinigung / Beleuchtung ───────────────────────────────────────────── */
  {
    titel: "Spielfeld reinigen",
    kategorie: "Reinigung",
    bauteil: "Spielfeld",
    taetigkeit: "Reinigen",
    intervallText: "300–500 Spiele / vierteljährlich",
    intervallTyp: "zeit",
    intervallTage: 90,
    prioritaet: "hoch",
    beschreibung: "Spielfeld gründlich reinigen",
  },
  {
    titel: "Spielfeld wachsen/polieren",
    kategorie: "Reinigung",
    bauteil: "Spielfeld",
    taetigkeit: "Reinigen",
    intervallText: "Halbjährlich (nach der Reinigung)",
    intervallTyp: "zeit",
    intervallTage: 180,
    prioritaet: "mittel",
    beschreibung:
      "Mit Carnauba-Wachs (kein Silikon) wachsen — schützt Spielfeld und Kugeln",
  },
  {
    titel: "Glas reinigen",
    kategorie: "Reinigung",
    bauteil: "Spielfeldglas / Backglass",
    taetigkeit: "Reinigen",
    intervallText: "Monatlich",
    intervallTyp: "zeit",
    intervallTage: 30,
    prioritaet: "niedrig",
    beschreibung: "Spielfeldglas und Backglass innen/außen reinigen",
  },
  {
    titel: "Beleuchtung testen",
    kategorie: "Beleuchtung",
    bauteil: "Lampen/LEDs",
    taetigkeit: "Testen",
    intervallText: "Halbjährlich (Lamp-Test)",
    intervallTyp: "zeit",
    intervallTage: 180,
    prioritaet: "niedrig",
    beschreibung: "Defekte Leuchtmittel im Lamp-Test identifizieren",
  },
];
