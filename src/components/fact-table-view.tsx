"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FactTable, FactType } from "@/lib/validators";

/*
  Faktentabelle als klassische Tabelle und — nur bei Switch-/Lamp-Matrix —
  alternativ als Raster im Stil der WPC-Service-Referenz. Zusätzlich:
  - Draht-Farbcodes (z. B. „Vio-Brn") werden als zweifarbige Chips visualisiert.
  - Tabellen mit einer Typ-Spalte bekommen Filter-Pills (Alle · High Power · …).
  Alles rein aus den extrahierten Fakten abgeleitet — funktioniert generisch für
  jedes künftige Handbuch.
*/

type MatrixCell = { num: string; label: string; typ: string };
type Matrix = { cols: number; rows: number; cells: Map<string, MatrixCell> };

/** Nur diese Typen ergeben eine Matrix. */
function isMatrixType(t: FactType): boolean {
  return t === "switches" || t === "lamps";
}

/* ── Draht-Farben ──────────────────────────────────────────────────────────
   WPC-Kabelbäume nutzen einen Basis-/Zweitband-Farbcode. Wir mappen die
   üblichen Kürzel (und ausgeschriebenen Namen) auf Hex und rendern einen
   zweifarbigen Chip. */
const WIRE_HEX: Record<string, string> = {
  brn: "#8a5a2b",
  red: "#cf3a2f",
  org: "#e07a1f",
  yel: "#e6b400",
  grn: "#2f8f3e",
  blu: "#2f6fd6",
  vio: "#7a4fc0",
  gry: "#9aa0a6",
  blk: "#2b2b2b",
  wht: "#eef0f2",
  pnk: "#e879a6",
  tan: "#c9a96a",
};
const FULLNAME: Record<string, string> = {
  brown: "brn", red: "red", orange: "org", yellow: "yel", green: "grn",
  blue: "blu", violet: "vio", purple: "vio", gray: "gry", grey: "gry",
  black: "blk", white: "wht", pink: "pnk", tan: "tan",
};
function normColor(t: string): string | null {
  const k = t.trim().toLowerCase();
  if (k in WIRE_HEX) return k;
  if (k in FULLNAME) return FULLNAME[k];
  return null;
}
/** Erkennt einen Draht-Farbcode (min. 2 bekannte Bänder, „-" getrennt; ein
    optionaler „/ Stecker"-Zusatz wird beibehalten). Sonst null. */
function parseWire(raw: string): { hexes: string[]; label: string } | null {
  const s = raw.trim();
  if (!s) return null;
  const slash = s.indexOf("/");
  const colorPart = (slash >= 0 ? s.slice(0, slash) : s).trim();
  const tokens = colorPart.split("-").map((t) => t.trim()).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 3) return null;
  const keys = tokens.map(normColor);
  if (keys.some((k) => k === null)) return null;
  return { hexes: keys.map((k) => WIRE_HEX[k as string]), label: s };
}
function wireBg(hexes: string[]): string {
  if (hexes.length === 1) return hexes[0];
  const n = hexes.length;
  const stops = hexes
    .map((h, i) => `${h} ${Math.round((i / n) * 100)}% ${Math.round(((i + 1) / n) * 100)}%`)
    .join(", ");
  return `linear-gradient(135deg, ${stops})`;
}

/** Nur der Farb-Chip (für kompakte Matrix-Köpfe). */
function WireChip({ code, className }: { code: string; className?: string }) {
  const p = parseWire(code);
  if (!p) return null;
  return (
    <span
      title={code}
      className={`inline-block h-2.5 w-4 flex-none rounded-[2px] border border-black/25 ${className ?? ""}`}
      style={{ background: wireBg(p.hexes) }}
    />
  );
}
/** Chip + Text (für Tabellenzellen). */
function WireSwatch({ code }: { code: string }) {
  const p = parseWire(code);
  if (!p) return <>{code}</>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <WireChip code={code} />
      {p.label}
    </span>
  );
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

function TableGrid({
  columns,
  rows,
  typ,
}: {
  columns: string[];
  rows: string[][];
  typ: FactType;
}) {
  // Bei Switch-/Lamp-Matrix die Column/Row-Zellen um den WPC-Draht-Farbcode ergänzen.
  const lower = columns.map((c) => c.toLowerCase());
  const colIdx = lower.findIndex((c) => c === "column" || c === "col" || c === "spalte");
  const rowIdx = lower.findIndex((c) => c === "row" || c === "reihe" || c === "zeile");
  const axis = AXIS[typ];

  const renderCell = (cell: string, ci: number) => {
    if (parseWire(cell)) return <WireSwatch code={cell} />; // Draht-Farbe → Chip + Text
    if (axis) {
      const n = Number.parseInt(cell, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 8) {
        if (ci === colIdx)
          return (
            <span className="inline-flex items-center gap-1.5">
              {cell} · <WireSwatch code={wire(axis.col, n)} />
            </span>
          );
        if (ci === rowIdx)
          return (
            <span className="inline-flex items-center gap-1.5">
              {cell} · <WireSwatch code={wire(axis.row, n)} />
            </span>
          );
      }
    }
    return cell;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-xs">
        {columns.length > 0 ? (
          <thead>
            <tr>
              {columns.map((c, i) => (
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
          {rows.map((row, r) => (
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
          className="grid gap-1"
          style={{
            gridTemplateColumns: `4.25rem repeat(${matrix.cols}, minmax(104px, 1fr))`,
          }}
        >
          {/* Kopfzeile: leere Ecke + Spaltenköpfe (Antriebsleitung) */}
          <div />
          {cols.map((c) => (
            <div key={c} className="px-1.5 pb-1 text-left">
              <div className="font-mono text-[11px] text-[var(--color-faint)]">{c}</div>
              {axis ? (
                <div className="mt-0.5 font-mono text-[10px] text-[var(--color-accent)]">
                  <WireSwatch code={wire(axis.col, c)} />
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
      <div className="flex flex-col items-end justify-center gap-0.5 pr-1">
        <div className="font-mono text-[11px] text-[var(--color-faint)]">{r}</div>
        {axis ? (
          <div className="font-mono text-[10px] text-[var(--color-muted)]">
            <WireSwatch code={wire(axis.row, r)} />
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

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.04em] transition-colors ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
          : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-fg)]"
      }`}
    >
      {children}
    </button>
  );
}

export function FactTableView({
  label,
  typ,
  table,
  open,
  onToggle,
}: {
  label: string;
  typ: FactType;
  table: FactTable;
  /** Kontrolliert vom Elternteil (MachineDataTables), damit KPI-Karten Bereiche
      aufklappen können. onToggle synchronisiert Klicks auf den Kopf zurück. */
  open: boolean;
  onToggle: (open: boolean) => void;
}) {
  const matrix = isMatrixType(typ) ? buildMatrix(table) : null;
  const [view, setView] = useState<"table" | "matrix">(matrix ? "matrix" : "table");
  const showMatrix = matrix !== null && view === "matrix";

  // Filter über eine Typ-Spalte (z. B. Spulen: High/Low Power/Flasher/…).
  // Platzhalter (leer, „-", „n/a") ergeben keinen sinnvollen Filter.
  const isRealValue = (v: string | undefined): v is string =>
    !!v && !/^(-+|–|—|n\/?a)$/i.test(v.trim());
  const filterIdx = table.columns.findIndex((c) => /^(typ|type|art)$/i.test(c.trim()));
  const filterValues =
    filterIdx >= 0
      ? Array.from(new Set(table.rows.map((r) => r[filterIdx]?.trim()).filter(isRealValue)))
      : [];
  const [filter, setFilter] = useState<string | null>(null);
  const canFilter = !showMatrix && filterValues.length >= 2;
  const rows =
    canFilter && filter
      ? table.rows.filter((r) => r[filterIdx]?.trim() === filter)
      : table.rows;

  return (
    <details
      open={open}
      onToggle={(e) => onToggle(e.currentTarget.open)}
      className="group overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)]"
    >
      {/* Kopf = Umschalter: Label + Zeilenzahl + Chevron. Nur nicht-interaktiver
          Inhalt, sonst würde ein Klick das Panel togglen (Matrix/Filter → Body). */}
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 hover:bg-[var(--color-inset)] group-open:border-b group-open:border-[var(--color-border)] [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-[11px] uppercase tracking-[1px] text-[var(--color-faint)]">
          {label}
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-[var(--color-faint)]">
            {table.rows.length}
          </span>
          <ChevronDown
            size={16}
            className="flex-none text-[var(--color-muted)] transition-transform group-open:rotate-180"
          />
        </span>
      </summary>

      {matrix ? (
        <div className="flex items-center justify-end gap-2 border-b border-[var(--color-border)] px-3 py-2">
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
        </div>
      ) : null}

      {canFilter ? (
        <div className="flex flex-wrap gap-1.5 border-b border-[var(--color-border)] px-3 py-2">
          <FilterPill active={filter === null} onClick={() => setFilter(null)}>
            Alle
          </FilterPill>
          {filterValues.map((v) => (
            <FilterPill key={v} active={filter === v} onClick={() => setFilter(v)}>
              {v}
            </FilterPill>
          ))}
        </div>
      ) : null}

      {showMatrix && matrix ? (
        <MatrixGrid matrix={matrix} typ={typ} />
      ) : (
        <TableGrid columns={table.columns} rows={rows} typ={typ} />
      )}
    </details>
  );
}
