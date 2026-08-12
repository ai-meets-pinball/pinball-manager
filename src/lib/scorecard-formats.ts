/*
  Maße gängiger Flipper-KARTEN (Instruction-/Score-/Anleitungskarten) je
  Hersteller-/Generations-Familie — als Code-Daten (Muster wie
  MAINTENANCE_STANDARD in lib/maintenance-catalog.ts): eine feste, gepflegte
  Referenzliste, KEINE DB-Tabelle.

  Zweck: Der QR-Melde-Code lässt sich passgenau auf eine Karte drucken, die in
  den vorhandenen Kartenhalter des Geräts passt. Die Familien-Namen folgen der
  gängigen Sammler-Taxonomie (Pinside/Marco „card sizes") und decken sich NICHT
  mit den Board-/Hardware-Namen der `generations`-Tabelle („Williams WPC-95",
  „Stern SPIKE2™ System"). Darum wird das Format im UI manuell gewählt — mit
  Vorauswahl über den Herstellernamen (`formatePassendZuHersteller`).

  Nicht enthalten: die Game-Plan-cocktail-Sonderkarte (trapezförmig,
  22 × 193 × 125 × 218 mm) — nicht rechteckig, hier nicht als Druckformat
  abbildbar.
*/
export type ScorecardFormat = {
  /** Stabiler Schlüssel (kebab) — Auswahlwert im UI. */
  id: string;
  /** Familien-/Herstellerlabel (Gruppenüberschrift), z. B. „Bally/Williams WPC". */
  hersteller: string;
  /** Kartenart, z. B. „Instruction", „Score", „Both cards". */
  kartentyp: string;
  breiteMm: number;
  hoeheMm: number;
};

export const SCORECARD_FORMATS: ScorecardFormat[] = [
  {
    id: "allied-instruction",
    hersteller: "Allied Leisure",
    kartentyp: "Instruction",
    breiteMm: 108,
    hoeheMm: 152,
  },
  {
    id: "allied-score",
    hersteller: "Allied Leisure",
    kartentyp: "Score",
    breiteMm: 58,
    hoeheMm: 152,
  },
  {
    id: "alvin-g",
    hersteller: "Alvin G.",
    kartentyp: "Beide Karten",
    breiteMm: 75,
    hoeheMm: 152,
  },
  {
    id: "atari-instruction",
    hersteller: "Atari",
    kartentyp: "Instruction",
    breiteMm: 127,
    hoeheMm: 114,
  },
  {
    id: "atari-score",
    hersteller: "Atari",
    kartentyp: "Score",
    breiteMm: 63,
    hoeheMm: 76,
  },
  {
    id: "atari-superman",
    hersteller: "Atari (Superman)",
    kartentyp: "Beide Karten",
    breiteMm: 102,
    hoeheMm: 146,
  },
  {
    id: "bally-em-instruction",
    hersteller: "Bally EM (älter)",
    kartentyp: "Instruction",
    breiteMm: 96,
    hoeheMm: 140,
  },
  {
    id: "bally-em-balls",
    hersteller: "Bally EM (älter)",
    kartentyp: "Balls per player",
    breiteMm: 38,
    hoeheMm: 96,
  },
  {
    id: "bally-ss",
    hersteller: "Bally Solid-State",
    kartentyp: "Beide Karten",
    breiteMm: 83,
    hoeheMm: 140,
  },
  {
    id: "bally-williams-wpc",
    hersteller: "Bally/Williams WPC",
    kartentyp: "Beide Karten",
    breiteMm: 82,
    hoeheMm: 152,
  },
  {
    id: "bell-games",
    hersteller: "Bell Games",
    kartentyp: "Beide Karten",
    breiteMm: 82,
    hoeheMm: 152,
  },
  {
    id: "capcom",
    hersteller: "Capcom",
    kartentyp: "Beide Karten",
    breiteMm: 83,
    hoeheMm: 143,
  },
  {
    id: "chicago-coin-instruction",
    hersteller: "Chicago Coin (coloured mask)",
    kartentyp: "Instruction",
    breiteMm: 152,
    hoeheMm: 108,
  },
  {
    id: "chicago-coin-score",
    hersteller: "Chicago Coin (coloured mask)",
    kartentyp: "Score",
    breiteMm: 103,
    hoeheMm: 74,
  },
  {
    id: "data-east",
    hersteller: "Data East",
    kartentyp: "Beide Karten",
    breiteMm: 76,
    hoeheMm: 140,
  },
  {
    id: "game-plan",
    hersteller: "Game Plan",
    kartentyp: "Beide Karten",
    breiteMm: 76,
    hoeheMm: 140,
  },
  {
    id: "gottlieb-em-instruction",
    hersteller: "Gottlieb EM (älter)",
    kartentyp: "Instruction",
    breiteMm: 76,
    hoeheMm: 154,
  },
  {
    id: "gottlieb-em-score",
    hersteller: "Gottlieb EM (älter)",
    kartentyp: "Score",
    breiteMm: 57,
    hoeheMm: 154,
  },
  {
    id: "gottlieb-em-title",
    hersteller: "Gottlieb EM (älter)",
    kartentyp: "Title card",
    breiteMm: 38,
    hoeheMm: 154,
  },
  {
    id: "gottlieb-em-backglass",
    hersteller: "Gottlieb EM (älter)",
    kartentyp: "Backglass score card",
    breiteMm: 73,
    hoeheMm: 146,
  },
  {
    id: "gottlieb-later-instruction",
    hersteller: "Gottlieb (später)",
    kartentyp: "Instruction",
    breiteMm: 108,
    hoeheMm: 154,
  },
  {
    id: "gottlieb-later-score",
    hersteller: "Gottlieb (später)",
    kartentyp: "Score",
    breiteMm: 57,
    hoeheMm: 154,
  },
  {
    id: "hankin",
    hersteller: "Hankin",
    kartentyp: "Instruction",
    breiteMm: 89,
    hoeheMm: 114,
  },
  {
    id: "interflip",
    hersteller: "Interflip",
    kartentyp: "Beide Karten",
    breiteMm: 73,
    hoeheMm: 142,
  },
  {
    id: "playmatic-instruction",
    hersteller: "Playmatic",
    kartentyp: "Instruction",
    breiteMm: 98,
    hoeheMm: 144,
  },
  {
    id: "playmatic-score",
    hersteller: "Playmatic",
    kartentyp: "Score",
    breiteMm: 57,
    hoeheMm: 141,
  },
  {
    id: "recel-instruction",
    hersteller: "Recel",
    kartentyp: "Instruction",
    breiteMm: 102,
    hoeheMm: 154,
  },
  {
    id: "recel-score",
    hersteller: "Recel",
    kartentyp: "Score",
    breiteMm: 58,
    hoeheMm: 154,
  },
  {
    id: "sega",
    hersteller: "Sega",
    kartentyp: "Beide Karten",
    breiteMm: 75,
    hoeheMm: 138,
  },
  {
    id: "stern-classic",
    hersteller: "Stern Electronics (classic)",
    kartentyp: "Beide Karten",
    breiteMm: 77,
    hoeheMm: 140,
  },
  {
    id: "stern-modern",
    hersteller: "Stern Pinball (modern)",
    kartentyp: "Beide Karten",
    breiteMm: 75,
    hoeheMm: 140,
  },
  {
    id: "williams-em-instruction",
    hersteller: "Williams EM",
    kartentyp: "Instruction",
    breiteMm: 90,
    hoeheMm: 154,
  },
  {
    id: "williams-em-balls",
    hersteller: "Williams EM",
    kartentyp: "Balls per player",
    breiteMm: 54,
    hoeheMm: 98,
  },
  {
    id: "williams-ss",
    hersteller: "Williams Solid-State",
    kartentyp: "Beide Karten",
    breiteMm: 83,
    hoeheMm: 154,
  },
  {
    id: "williams-bally-wpc",
    hersteller: "Williams/Bally WPC",
    kartentyp: "Beide Karten",
    breiteMm: 82,
    hoeheMm: 152,
  },
  {
    id: "zaccaria-large",
    hersteller: "Zaccaria",
    kartentyp: "Zwei große Karten",
    breiteMm: 82,
    hoeheMm: 154,
  },
  {
    id: "zaccaria-centre",
    hersteller: "Zaccaria",
    kartentyp: "Mittelkarte",
    breiteMm: 57,
    hoeheMm: 104,
  },
];

/*
  Best-Effort-Vorauswahl: liefert die Formate, deren Familienlabel den
  Herstellernamen der Maschine (case-insensitiv) als Teilwort enthält — bzw.
  umgekehrt. Deckt die üblichen Fälle ab (Williams, Bally, Stern, Gottlieb,
  Data East, Sega, Capcom, Zaccaria, Atari, Playmatic, Recel …). Kein Treffer →
  leeres Array (dann bleibt es bei der manuellen Wahl).
*/
export function formatePassendZuHersteller(
  hersteller: string | null | undefined,
): ScorecardFormat[] {
  const h = (hersteller ?? "").trim().toLowerCase();
  if (!h) return [];
  // Erstes Wort des Herstellers (z. B. „Williams" aus „Williams Electronics").
  const kern = h.split(/[\s/,]+/)[0];
  if (!kern) return [];
  return SCORECARD_FORMATS.filter((f) => {
    const label = f.hersteller.toLowerCase();
    return label.includes(kern) || h.includes(label.split(/[\s/,(]+/)[0]);
  });
}
