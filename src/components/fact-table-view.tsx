"use client";

import { useState } from "react";
import type { FactTable, FactType } from "@/lib/validators";

/*
  Zeigt eine Faktentabelle als klassische Tabelle und — wo es Sinn ergibt
  (Switch-/Lamp-Matrix) — alternativ als Raster. Angelehnt an die WPC-Service-
  Referenz: Nummer je Zelle, Details per Hover; Switch-Matrix nach Typ eingefärbt
  (mechanisch / opto / nicht belegt), Achsen = Antriebs- × Rückleitung.
*/

type MatrixCell = { num: string; label: string };
type Matrix = { cols: number; rows: number; cells: Map<string, MatrixCell> };

/** Versucht, aus einer Tabelle eine Matrix (Spalte×Reihe) abzuleiten. */
function buildMatrix(table: FactTable): Matrix | null {
  const lower = table.columns.map((c) => c.toLowerCase());
  const colIdx = lower.findIndex((c) => c === "column" || c === "col" || c === "spalte");
  const rowIdx = lower.findIndex((c) => c === "row" || c === "reihe" || c === "zeile");
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
      // Fallback: zweistellige Nummer = Spalte×10 + Reihe (z. B. Lampen 11..88).
      const n = Number.parseInt(r[idIdx], 10);
      if (!Number.isFinite(n) || n < 11 || n > 99) continue;
      c = Math.floor(n / 10);
      rw = n % 10;
    }
    if (!(c >= 1 && c <= 9 && rw >= 1 && rw <= 9)) continue;
    maxC = Math.max(maxC, c);
    maxR = Math.max(maxR, rw);
    cells.set(`${c}-${rw}`, { num: r[idIdx] ?? "", label: r[labelIdx] ?? "" });
  }
  return cells.size >= 4 ? { cols: maxC, rows: maxR, cells } : null;
}

/* Farben (theme-aware via color-mix). Switch-Matrix nach Typ, sonst neutral. */
const OPTO = "color-mix(in srgb, var(--color-success) 22%, transparent)";
const MECH = "color-mix(in srgb, var(--color-accent) 18%, transparent)";
const LAMP = "var(--color-inset)";

function cellBackground(typ: FactType, label: string): string {
  if (typ === "switches") return /opto/i.test(label) ? OPTO : MECH;
  return LAMP; // Lampen & sonstige: neutrale Füllung für belegte Zellen
}

function TableGrid({ table }: { table: FactTable }) {
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
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LegendChip({ bg, children }: { bg: string; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-3 w-3 rounded-[3px] border border-[var(--color-border)]"
        style={{ background: bg }}
      />
      {children}
    </span>
  );
}

function MatrixGrid({ matrix, typ }: { matrix: Matrix; typ: FactType }) {
  const cols = Array.from({ length: matrix.cols }, (_, i) => i + 1);
  const rows = Array.from({ length: matrix.rows }, (_, i) => i + 1);
  const isSwitch = typ === "switches";

  return (
    <div className="space-y-3 p-3">
      {/* Achsenbeschriftung */}
      <div className="font-mono text-[10px] uppercase tracking-[1px] text-[var(--color-faint)]">
        Spalte {isSwitch ? "= Antriebsleitung" : ""} → · Reihe{" "}
        {isSwitch ? "= Rückleitung" : ""} ↓ · Nr. = Spalte×10 + Reihe · Details per Hover
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse font-mono text-[11px]">
          <thead>
            <tr>
              <th className="p-1" />
              {cols.map((c) => (
                <th
                  key={c}
                  className="min-w-[46px] border border-[var(--color-border)] px-2 py-1 text-center font-semibold text-[var(--color-fg)]"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r}>
                <th className="border border-[var(--color-border)] px-2 py-1 text-center font-semibold text-[var(--color-fg)]">
                  {r}
                </th>
                {cols.map((c) => {
                  const cell = matrix.cells.get(`${c}-${r}`);
                  return (
                    <td
                      key={c}
                      title={cell ? `${cell.num} · ${cell.label}` : "nicht belegt"}
                      className="border border-[var(--color-border)] px-2 py-1 text-center text-[var(--color-fg)]"
                      style={
                        cell
                          ? { background: cellBackground(typ, cell.label) }
                          : undefined
                      }
                    >
                      {cell ? (
                        <span className="font-bold">{cell.num}</span>
                      ) : (
                        <span className="text-[var(--color-faint)]">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legende (nur Switch-Matrix, nach Typ) */}
      {isSwitch ? (
        <div className="flex flex-wrap gap-4 font-mono text-[10px] text-[var(--color-muted)]">
          <LegendChip bg={MECH}>mechanisch</LegendChip>
          <LegendChip bg={OPTO}>opto</LegendChip>
          <LegendChip bg="transparent">nicht belegt</LegendChip>
        </div>
      ) : null}
    </div>
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
  const matrix = buildMatrix(table);
  const [view, setView] = useState<"table" | "matrix">("table");
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
              {(["table", "matrix"] as const).map((v) => (
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
        <TableGrid table={table} />
      )}
    </div>
  );
}
