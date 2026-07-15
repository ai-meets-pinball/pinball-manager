"use client";

import { useState } from "react";
import type { FactTable, FactType } from "@/lib/validators";

/*
  Faktentabelle als klassische Tabelle und — nur bei Switch-/Lamp-Matrix —
  alternativ als Raster im Stil der WPC-Service-Referenz: Karten-Zellen mit
  Bezeichnung + Nummer, Spalten-/Reihenköpfe mit den WPC-Draht-Farbcodes
  (Antriebs- × Rückleitung), Opto-Schalter farblich markiert.
*/

type MatrixCell = { num: string; label: string; typ: string };
type Matrix = { cols: number; rows: number; cells: Map<string, MatrixCell> };

/** Nur diese Typen ergeben eine Matrix. */
function isMatrixType(t: FactType): boolean {
  return t === "switches" || t === "lamps";
}

/** WPC-Draht-Farbcode: 2. Band nach Widerstands-Reihenfolge; kollidiert es mit
    der Basisfarbe, wird „Blk" verwendet (z. B. Yel-Blk statt Yel-Yel). */
const BAND = ["Brn", "Red", "Org", "Yel", "Grn", "Blu", "Vio", "Gry"];
function wire(base: string, i: number): string {
  const second = BAND[i - 1] ?? "";
  return `${base}-${second.toLowerCase() === base.toLowerCase() ? "Blk" : second}`;
}
const AXIS: Record<string, { col: string; row: string }> = {
  lamps: { col: "Yel", row: "Red" }, // Antrieb Gelb, Rückleitung Rot
  switches: { col: "Grn", row: "Wht" }, // Antrieb Grün, Rückleitung Weiß
};
// Opto-Schalter werden dezent grün getönt (color-mix als Inline-Style → theme-aware).
const OPTO_BG = "color-mix(in srgb, var(--color-success) 12%, transparent)";

/** Leitet aus einer Tabelle eine Matrix (Spalte×Reihe) ab. */
function buildMatrix(table: FactTable): Matrix | null {
  const lower = table.columns.map((c) => c.toLowerCase());
  const colIdx = lower.findIndex((c) => c === "column" || c === "col" || c === "spalte");
  const rowIdx = lower.findIndex((c) => c === "row" || c === "reihe" || c === "zeile");
  const typIdx = lower.findIndex((c) => c === "typ" || c === "type" || c === "art");
  const idIdx = 0;
  const labelIdx = table.columns.length - 1;

  const cells = new Map<string, MatrixCell>();
  let maxC = 0;
  let maxR = 0;

  for (const r of table.rows) {
    let c: number;
    let rw: number;
    if (colIdx >= 0 && rowIdx >= 0) {
      c = Number.parseInt(r[colIdx], 10);
      rw = Number.parseInt(r[rowIdx], 10);
    } else {
      const n = Number.parseInt(r[idIdx], 10); // Fallback: Nummer = Spalte×10 + Reihe
      if (!Number.isFinite(n) || n < 11 || n > 99) continue;
      c = Math.floor(n / 10);
      rw = n % 10;
    }
    if (!(c >= 1 && c <= 9 && rw >= 1 && rw <= 9)) continue;
    maxC = Math.max(maxC, c);
    maxR = Math.max(maxR, rw);
    cells.set(`${c}-${rw}`, {
      num: r[idIdx] ?? "",
      label: r[labelIdx] ?? "",
      typ: typIdx >= 0 ? (r[typIdx] ?? "") : "",
    });
  }
  return cells.size >= 4 ? { cols: maxC, rows: maxR, cells } : null;
}

function TableGrid({ table, typ }: { table: FactTable; typ: FactType }) {
  // Bei Switch-/Lamp-Matrix die Column/Row-Zellen um den WPC-Draht-Farbcode ergänzen.
  const lower = table.columns.map((c) => c.toLowerCase());
  const colIdx = lower.findIndex((c) => c === "column" || c === "col" || c === "spalte");
  const rowIdx = lower.findIndex((c) => c === "row" || c === "reihe" || c === "zeile");
  const axis = AXIS[typ];

  const renderCell = (cell: string, ci: number): string => {
    if (!axis) return cell;
    const n = Number.parseInt(cell, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 8) {
      if (ci === colIdx) return `${cell} · ${wire(axis.col, n)}`;
      if (ci === rowIdx) return `${cell} · ${wire(axis.row, n)}`;
    }
    return cell;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-xs">
        {table.columns.length > 0 ? (
          <thead>
            <tr>
              {table.columns.map((c, i) => (
                <th
                  key={i}
                  className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-2 text-left font-semibold text-[var(--color-muted)]"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r} className="odd:bg-[var(--color-overlay)]">
              {row.map((cell, c) => (
                <td
                  key={c}
                  className="whitespace-nowrap px-3 py-1.5 text-[var(--color-fg)]"
                >
                  {renderCell(cell, c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatrixGrid({ matrix, typ }: { matrix: Matrix; typ: FactType }) {
  const cols = Array.from({ length: matrix.cols }, (_, i) => i + 1);
  const rows = Array.from({ length: matrix.rows }, (_, i) => i + 1);
  const isSwitch = typ === "switches";
  const axis = AXIS[typ];

  const hint = isSwitch
    ? `${matrix.cols}×${matrix.rows}-Matrix · Spalte = Antriebsleitung, Reihe = Rückleitung · Nr. = Spalte×10 + Reihe · Details per Hover`
    : `${matrix.cols}×${matrix.rows}-Lampenmatrix · Lamp-Nr. = Spalte×10 + Reihe · Details per Hover`;

  return (
    <div className="space-y-3 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.5px] text-[var(--color-faint)]">
        {hint}
      </p>

      <div className="overflow-x-auto">
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `2.75rem repeat(${matrix.cols}, minmax(112px, 1fr))`,
          }}
        >
          {/* Kopfzeile: leere Ecke + Spaltenköpfe (Antriebsleitung) */}
          <div />
          {cols.map((c) => (
            <div key={c} className="px-2 pb-1 text-left">
              <div className="font-mono text-[11px] text-[var(--color-faint)]">{c}</div>
              {axis ? (
                <div className="font-mono text-[10px] text-[var(--color-accent)]">
                  {wire(axis.col, c)}
                </div>
              ) : null}
            </div>
          ))}

          {/* Datenzeilen: Reihenkopf (Rückleitung) + Zellen */}
          {rows.map((r) => (
            <FactTableRow key={r} r={r} cols={cols} matrix={matrix} typ={typ} axis={axis} />
          ))}
        </div>
      </div>

      {isSwitch ? (
        <div className="flex flex-wrap gap-4 font-mono text-[10px] text-[var(--color-muted)]">
          <Legend border="var(--color-success)" bg={OPTO_BG}>opto</Legend>
          <Legend border="var(--color-border)" bg="var(--color-surface)">mechanisch</Legend>
          <Legend border="var(--color-border)" bg="transparent" dashed>nicht belegt</Legend>
        </div>
      ) : null}
    </div>
  );
}

function FactTableRow({
  r,
  cols,
  matrix,
  typ,
  axis,
}: {
  r: number;
  cols: number[];
  matrix: Matrix;
  typ: FactType;
  axis?: { col: string; row: string };
}) {
  return (
    <>
      <div className="flex flex-col justify-center pr-1 text-right">
        <div className="font-mono text-[11px] text-[var(--color-faint)]">{r}</div>
        {axis ? (
          <div className="font-mono text-[10px] text-[var(--color-muted)]">
            {wire(axis.row, r)}
          </div>
        ) : null}
      </div>
      {cols.map((c) => {
        const cell = matrix.cells.get(`${c}-${r}`);
        if (!cell) {
          return (
            <div
              key={c}
              className="min-h-[52px] rounded-md border border-dashed border-[var(--color-border)]"
            />
          );
        }
        const opto = typ === "switches" && /opto/i.test(`${cell.typ} ${cell.label}`);
        return (
          <div
            key={c}
            title={`${cell.num} · ${cell.label}`}
            className={`flex min-h-[52px] flex-col justify-between rounded-md border px-2.5 py-2 ${
              opto ? "border-[var(--color-success)]" : "border-[var(--color-border)]"
            }`}
            style={{ background: opto ? OPTO_BG : "var(--color-surface)" }}
          >
            <span className="text-[12px] font-medium leading-tight text-[var(--color-fg)]">
              {cell.label}
            </span>
            <span className="self-end font-mono text-[10px] text-[var(--color-faint)]">
              {cell.num}
            </span>
          </div>
        );
      })}
    </>
  );
}

function Legend({
  border,
  bg,
  dashed,
  children,
}: {
  border: string;
  bg: string;
  dashed?: boolean;
  children: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-3 w-3 rounded-[3px] border"
        style={{ borderColor: border, background: bg, borderStyle: dashed ? "dashed" : "solid" }}
      />
      {children}
    </span>
  );
}

export function FactTableView({
  label,
  typ,
  table,
}: {
  label: string;
  typ: FactType;
  table: FactTable;
}) {
  const matrix = isMatrixType(typ) ? buildMatrix(table) : null;
  const [view, setView] = useState<"table" | "matrix">(matrix ? "matrix" : "table");
  const showMatrix = matrix !== null && view === "matrix";

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <span className="font-mono text-[11px] uppercase tracking-[1px] text-[var(--color-faint)]">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {matrix ? (
            <div className="flex overflow-hidden rounded border border-[var(--color-border)] text-[10px]">
              {(["matrix", "table"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`px-2 py-0.5 font-mono uppercase ${
                    view === v
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                      : "text-[var(--color-muted)] hover:bg-[var(--color-inset)]"
                  }`}
                >
                  {v === "table" ? "Tabelle" : "Matrix"}
                </button>
              ))}
            </div>
          ) : null}
          <span className="font-mono text-[11px] text-[var(--color-faint)]">
            {table.rows.length}
          </span>
        </div>
      </div>
      {showMatrix && matrix ? (
        <MatrixGrid matrix={matrix} typ={typ} />
      ) : (
        <TableGrid table={table} typ={typ} />
      )}
    </div>
  );
}
