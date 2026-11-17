import type { FactTable } from "@/lib/validators";

/*
  Switch-/Lamp-Matrix aus einer Faktentabelle ableiten (Spalte × Reihe).
  Rein — die Darstellung lebt in components/fact-table-view.tsx.
*/

export type MatrixCell = { num: string; label: string; typ: string };
export type Matrix = {
  cols: number;
  rows: number;
  cells: Map<string, MatrixCell>;
  /** Folgt jede Nummer „Spalte×10 + Reihe" (WPC)? Sega/Stern zählen fortlaufend. */
  nrIstSpalteReihe: boolean;
};

/** Obergrenze für ausdrücklich angegebene Spalte/Reihe (Sega: 8×10). Größere
    Werte sind Extraktionsmüll, kein Raster. */
const MAX_ACHSE = 16;

/** Leitet aus einer Tabelle eine Matrix (Spalte×Reihe) ab. */
export function buildMatrix(table: FactTable): Matrix | null {
  const lower = table.columns.map((c) => c.toLowerCase());
  const colIdx = lower.findIndex(
    (c) => c === "column" || c === "col" || c === "spalte",
  );
  const rowIdx = lower.findIndex(
    (c) => c === "row" || c === "reihe" || c === "zeile",
  );
  const typIdx = lower.findIndex(
    (c) => c === "typ" || c === "type" || c === "art",
  );
  const idIdx = 0;
  const labelIdx = table.columns.length - 1;

  const cells = new Map<string, MatrixCell>();
  let maxC = 0;
  let maxR = 0;
  let nrIstSpalteReihe = true;
  const achsen = colIdx >= 0 && rowIdx >= 0;
  // Aus der Nummer abgeleitet geht die Formel nur bis 9 — sonst bis MAX_ACHSE.
  const max = achsen ? MAX_ACHSE : 9;

  for (const r of table.rows) {
    let c: number;
    let rw: number;
    if (achsen) {
      c = Number.parseInt(r[colIdx], 10);
      rw = Number.parseInt(r[rowIdx], 10);
    } else {
      const n = Number.parseInt(r[idIdx], 10); // Fallback: Nummer = Spalte×10 + Reihe
      if (!Number.isFinite(n) || n < 11 || n > 99) continue;
      c = Math.floor(n / 10);
      rw = n % 10;
    }
    if (!(c >= 1 && c <= max && rw >= 1 && rw <= max)) continue;
    maxC = Math.max(maxC, c);
    maxR = Math.max(maxR, rw);
    if (Number.parseInt(r[idIdx], 10) !== c * 10 + rw) nrIstSpalteReihe = false;
    cells.set(`${c}-${rw}`, {
      num: r[idIdx] ?? "",
      label: r[labelIdx] ?? "",
      typ: typIdx >= 0 ? (r[typIdx] ?? "") : "",
    });
  }
  return cells.size >= 4
    ? { cols: maxC, rows: maxR, cells, nrIstSpalteReihe }
    : null;
}
