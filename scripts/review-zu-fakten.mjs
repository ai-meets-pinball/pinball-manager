/*
  Review-JSON → Fakten-Import-JSON (Handbuch-Daten).

  Hintergrund (2026-09-21): Ein Nutzer hat aus dem Import-JSON des Pinball
  Managers mit einem externen Modell ein angereichertes „technical master
  review" erzeugt (Top-Level `sections`, Tabellen als Objekt-Records mit
  unseren Spaltennamen, dazu LED-Ketten, Gummis, Schrauben, Boards, Firmware,
  3D-Druckteile und wörtliche Handbuch-Auszüge). Der JSON-Import der App
  (src/lib/import-facts.ts) kennt nur die neun Faktentabellen als
  `{ columns, rows }` — dieses Skript formt das eine ins andere um.

  Reine Umformung, kein DB-Zugriff. Prosa-Abschnitte (troubleshooting,
  modifications, software_procedures …) werden bewusst NICHT übernommen: sie
  gehören in den Guide, nicht in Faktentabellen.

  Aufruf:  node scripts/review-zu-fakten.mjs <eingabe.json> <ausgabe.json>
*/
import fs from "node:fs";

// Kanonische Spalten — wörtlich aus FACT_COLUMNS in src/lib/validators.ts
// (dieses Skript kann kein TypeScript importieren). Reihenfolge ist
// load-bearing: Spalte 0 = Nummer/ID, letzte = Bezeichnung.
const FACT_COLUMNS = {
  coils: ["Sol/No", "Funktion", "Typ", "Drive Q", "Wire", "Board"],
  switches: ["Sw/No", "Column", "Row", "Typ", "Funktion"],
  lamps: ["Lamp/No", "Column", "Row", "Funktion"],
  fuses: ["Board", "Fuse", "Rating", "Schützt"],
  parts: ["Part No", "Beschreibung"],
  rules: ["Adj/No", "Beschreibung", "Bereich/Standard"],
  screws: ["Schraube", "Größe/Gewinde", "Anzahl", "Einbauort"],
  rubbers: ["Gummi", "Größe", "Anzahl", "Einbauort"],
  electronics: ["Bauteil", "Wert/Typ", "Position", "Hinweis"],
};

const [, , eingabe, ausgabe] = process.argv;
if (!eingabe || !ausgabe) {
  console.error("Aufruf: node scripts/review-zu-fakten.mjs <eingabe.json> <ausgabe.json>");
  process.exit(1);
}

const review = JSON.parse(fs.readFileSync(eingabe, "utf8"));
const s = review.sections ?? {};

/** Zelle als String; null/undefined → leer, Zahlen → Text. */
const zelle = (v) => (v == null ? "" : String(v).trim());
const liste = (v) => (Array.isArray(v) ? v : []);

/** Objekt-Records mit unseren Spaltennamen → Zeilen in Spaltenreihenfolge. */
function ausRecords(typ, records) {
  return liste(records).map((r) => FACT_COLUMNS[typ].map((c) => zelle(r[c])));
}

const tabellen = {
  coils: ausRecords("coils", s.coils_and_actuators?.records),
  switches: ausRecords("switches", s.switches_and_inputs?.records),
  fuses: ausRecords("fuses", s.fuses_and_circuits?.records),
  rules: ausRecords("rules", s.rules_legacy?.records),

  // Teile: die „legacy"-Liste (unser früheres Import-Ergebnis) plus die
  // 3D-Druckteile als eigene Zeilen. Die per-Baugruppe-Stücklisten der Datei
  // sind leer (review_queue) und werden nicht angefasst.
  parts: [
    ...ausRecords("parts", s.review_staging?.unassigned_legacy_parts?.records),
    ...liste(s.printed_3d_parts).map((p) => [
      "3D-Druck",
      [zelle(p.part_name), zelle(p.description)].filter(Boolean).join(" — "),
    ]),
  ],

  // LEDs: Heighway adressiert seriell je I/O-Board und Kette, keine Matrix.
  // Column = Board, Row = Kette: in der Tabelle lesbar; buildMatrix in
  // fact-table-view.tsx ergibt bei nicht-numerischen Zellen bewusst KEIN Raster.
  lamps: liste(s.lamp_and_led_matrix?.records).map((l) => [
    `IO${zelle(l.board)} ${zelle(l.chain)} ${zelle(l.number)}`.trim(),
    zelle(l.board_name),
    zelle(l.chain),
    zelle(l.description),
  ]),

  rubbers: liste(s.rubber_ring_map?.rings).map((r) => [
    zelle(r.type),
    zelle(r.size),
    zelle(r.quantity),
    r.map_color ? `Gummiplan: ${zelle(r.map_color)}` : "",
  ]),

  screws: liste(s.fasteners).map((f) => [zelle(f.description), "", "", ""]),

  electronics: [
    ...liste(s.boards_and_assemblies).map((b) => [
      zelle(b.name),
      "Baugruppe",
      zelle(b.assembly_id),
      "",
    ]),
    ...liste(s.software_and_hardware_versions?.hardware_revisions).map((h) => [
      zelle(h.assembly),
      h.revision ? `Rev. ${zelle(h.revision)}` : "",
      "",
      "",
    ]),
    ...liste(s.software_and_hardware_versions?.software_and_firmware).map((f) => [
      zelle(f.system),
      f.version ? `Firmware ${zelle(f.version)}` : "",
      "",
      [zelle(f.description), f.release_status ? `(${zelle(f.release_status)})` : ""]
        .filter(Boolean)
        .join(" "),
    ]),
  ],
};

const out = Object.fromEntries(
  Object.keys(FACT_COLUMNS).map((typ) => [
    typ,
    { columns: FACT_COLUMNS[typ], rows: tabellen[typ] },
  ]),
);
fs.writeFileSync(ausgabe, JSON.stringify(out, null, 2) + "\n");

for (const typ of Object.keys(FACT_COLUMNS)) {
  console.log(`${typ.padEnd(12)} ${String(out[typ].rows.length).padStart(4)} Zeilen`);
}
console.log(`Geschrieben: ${ausgabe}`);
