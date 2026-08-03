import {
  extractSchema,
  FACT_COLUMNS,
  FACT_TYPES,
  type FactTable,
  type FactType,
} from "@/lib/validators";

/*
  JSON-Import von Handbuch-Fakten (Alternative zur KI-/PDF-Extraktion): der
  Nutzer erzeugt die Fakten selbst in ChatGPT (mit IMPORT_PROMPT) und fügt das
  JSON ein. `parseImportedFacts` ist die EINE Validierungs-/Normalisierungs-
  funktion — sie läuft clientseitig für die Vorschau UND serverseitig autoritativ
  in der Import-Action (db/actions/machine-data.ts). Reines Modul (keine DB,
  kein "use server") → in beiden Welten importierbar.
*/

export type ExtractResult = ReturnType<typeof extractSchema.parse>;

/** `knowledge.inhalt` (extractSchema-Objekt, nur vorhandene Typen) in die
    {typ, daten}[]-Form von `MachineDataTables` transformieren. Liegt hier
    (reines Modul), weil Server- UND Client-Komponenten sie aufrufen. */
export function inhaltToFacts(
  inhalt: unknown,
): { typ: string; daten: unknown }[] {
  if (!inhalt || typeof inhalt !== "object") return [];
  return Object.entries(inhalt as Record<string, unknown>).map(
    ([typ, daten]) => ({ typ, daten }),
  );
}

/** Kurzbericht je vorhandenem Typ für die Vorschau. */
export type FactReport = {
  typ: FactType;
  rows: number;
  /** Spalten stimmen exakt mit FACT_COLUMNS überein. */
  columnsOk: boolean;
  /** switches/lamps: rendert als Matrix? Sonst null. */
  matrix: boolean | null;
};

export type ImportResult = {
  /** true = keine harten Fehler UND mindestens eine Tabelle mit Zeilen. */
  ok: boolean;
  /** normalisiertes, importfertiges Ergebnis (nur wenn ok). */
  result?: ExtractResult;
  present: FactType[];
  reports: FactReport[];
  warnings: string[];
  errors: string[];
};

const LABEL: Record<FactType, string> = {
  coils: "Spulen & Flasher",
  switches: "Schalter-Matrix",
  lamps: "Lampen-Matrix",
  fuses: "Sicherungen",
  parts: "Teileliste",
  rules: "Regeln / Adjustments",
};

// Beispiel-Objekt aus den kanonischen Spalten (immer in Sync mit FACT_COLUMNS).
const EXAMPLE = JSON.stringify(
  Object.fromEntries(
    FACT_TYPES.map((t) => [t, { columns: FACT_COLUMNS[t], rows: [] }]),
  ),
  null,
  2,
);

/** Der Prompt für ChatGPT (auch per „kopieren"-Button in der UI). */
export const IMPORT_PROMPT = `Du bist ein Extraktor für technische Referenzdaten aus Flipperautomaten-Handbüchern.
Ich lade dir das Handbuch (PDF) hoch. Extrahiere AUSSCHLIESSLICH die technischen
Referenztabellen, sofern im Handbuch vorhanden, und gib GENAU EIN JSON-Objekt zurück (sonst nichts).

Verwende je Tabelle EXAKT diese Spaltenüberschriften in dieser Reihenfolge — auch wenn das
Handbuch sie anders benennt; ordne die Werte zu, fehlende Werte = "":

- coils    → ${JSON.stringify(FACT_COLUMNS.coils)}
- switches → ${JSON.stringify(FACT_COLUMNS.switches)}
             Column/Row = Rasterposition 1–9; bei Nicht-Matrix-Schaltern "". Typ = "opto" oder "mechanisch".
- lamps    → ${JSON.stringify(FACT_COLUMNS.lamps)}
             Lampenmatrix 8×8; Lamp/No = Column×10 + Row (Column/Row aus der Nummer ableiten).
- fuses    → ${JSON.stringify(FACT_COLUMNS.fuses)}
- parts    → ${JSON.stringify(FACT_COLUMNS.parts)}
- rules    → ${JSON.stringify(FACT_COLUMNS.rules)}

Ausgabe — GENAU dieses Objekt mit allen sechs Schlüsseln. Jede Tabelle ist
{"columns":[...],"rows":[[...],...]}; eine Zeile ist ein Array von Zellen (alle als String,
positionsgleich zu columns). Fehlt eine Tabelle, gib leere "rows" ([]) zurück:

${EXAMPLE}

Regeln:
- NUR reine Fakten aus diesen Tabellen. KEIN Fließtext, KEINE Spielregel-Erklärungen, KEINE Seiten.
- Alle Zellen als String; jede Zeile hat genau so viele Zellen wie "columns".
- Keine Duplikate, keine wiederholten Kopfzeilen.
- Antworte NUR mit dem JSON — keine Erklärung, kein Markdown, keine \`\`\`-Codezäune.`;

/** Schneidet das erste JSON-Objekt aus dem Text (toleriert Prosa/```-Zäune davor/danach). */
function sliceJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  return raw.slice(start, end + 1);
}

function cellToString(c: unknown): string {
  if (c == null) return "";
  if (typeof c === "object") return JSON.stringify(c);
  return String(c);
}

/** Normalisiert eine einzelne Tabelle und sammelt Warnungen/harte Fehler. */
function normTable(
  typ: FactType,
  raw: unknown,
): { table: FactTable; warnings: string[]; error?: string } {
  const warnings: string[] = [];
  const empty: FactTable = { columns: [], rows: [] };

  if (raw == null) return { table: empty, warnings };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { table: empty, warnings, error: `${LABEL[typ]}: Eintrag ist kein Objekt.` };
  }
  const r = raw as Record<string, unknown>;

  if (r.columns != null && !Array.isArray(r.columns)) {
    return { table: empty, warnings, error: `${LABEL[typ]}: „columns" ist kein Array.` };
  }
  if (r.rows != null && !Array.isArray(r.rows)) {
    return { table: empty, warnings, error: `${LABEL[typ]}: „rows" ist kein Array.` };
  }
  const rawRows = Array.isArray(r.rows) ? r.rows : [];
  for (const row of rawRows) {
    if (!Array.isArray(row)) {
      return { table: empty, warnings, error: `${LABEL[typ]}: eine Zeile ist kein Array.` };
    }
  }

  // Keine Zeilen → Tabelle gilt als nicht vorhanden.
  if (rawRows.length === 0) return { table: empty, warnings };

  let columns = Array.isArray(r.columns) ? r.columns.map(cellToString) : [];
  if (columns.length === 0) {
    columns = [...FACT_COLUMNS[typ]];
    warnings.push(`${LABEL[typ]}: Spaltenüberschriften fehlten — Standard eingesetzt.`);
  }

  let padded = false;
  const rows = (rawRows as unknown[][]).map((row) => {
    const cells = row.map(cellToString);
    while (cells.length < columns.length) {
      cells.push("");
      padded = true;
    }
    return cells;
  });
  if (padded) {
    warnings.push(`${LABEL[typ]}: zu kurze Zeilen mit leeren Zellen aufgefüllt.`);
  }
  if (JSON.stringify(columns) !== JSON.stringify(FACT_COLUMNS[typ])) {
    warnings.push(
      `${LABEL[typ]}: Spalten weichen vom Standard ab (Anzeige/Matrix evtl. nicht ideal).`,
    );
  }

  return { table: { columns, rows }, warnings };
}

/** Spiegelt die Matrix-Regeln aus fact-table-view.tsx (buildMatrix): rendert die
    Tabelle als Raster? Braucht ≥ 4 Zellen mit gültiger Spalte×Reihe (1–9). */
function wouldRenderMatrix(table: FactTable): boolean {
  const lower = table.columns.map((c) => c.toLowerCase());
  const colIdx = lower.findIndex((c) => c === "column" || c === "col" || c === "spalte");
  const rowIdx = lower.findIndex((c) => c === "row" || c === "reihe" || c === "zeile");
  let cells = 0;
  for (const r of table.rows) {
    let c: number;
    let rw: number;
    if (colIdx >= 0 && rowIdx >= 0) {
      c = Number.parseInt(r[colIdx], 10);
      rw = Number.parseInt(r[rowIdx], 10);
    } else {
      const n = Number.parseInt(r[0], 10);
      if (!Number.isFinite(n) || n < 11 || n > 99) continue;
      c = Math.floor(n / 10);
      rw = n % 10;
    }
    if (c >= 1 && c <= 9 && rw >= 1 && rw <= 9) cells++;
  }
  return cells >= 4;
}

/** Prüft, normalisiert und bewertet importiertes Fakten-JSON. */
export function parseImportedFacts(raw: string): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const slice = sliceJsonObject(raw ?? "");
  if (!slice) {
    return {
      ok: false,
      present: [],
      reports: [],
      warnings,
      errors: ["Kein JSON-Objekt gefunden. Füge die JSON-Ausgabe aus ChatGPT ein."],
    };
  }

  let data: unknown;
  try {
    data = JSON.parse(slice);
  } catch {
    return {
      ok: false,
      present: [],
      reports: [],
      warnings,
      errors: ["Kein gültiges JSON — bitte die komplette, unveränderte Ausgabe einfügen."],
    };
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return {
      ok: false,
      present: [],
      reports: [],
      warnings,
      errors: ["Das JSON muss ein Objekt mit den Typ-Schlüsseln (coils, switches, …) sein."],
    };
  }
  const rec = data as Record<string, unknown>;

  const tables = {} as Record<FactType, FactTable>;
  for (const typ of FACT_TYPES) {
    const n = normTable(typ, rec[typ]);
    if (n.error) errors.push(n.error);
    warnings.push(...n.warnings);
    tables[typ] = n.table;
  }

  // Autoritative Formprüfung (defensiv; nach der Normalisierung erwartet grün).
  const parsed = extractSchema.safeParse(tables);
  if (!parsed.success) {
    errors.push(parsed.error.issues[0]?.message ?? "Ungültige Struktur.");
  }
  const result = parsed.success ? parsed.data : undefined;
  const present = result
    ? FACT_TYPES.filter((t) => result[t].rows.length > 0)
    : [];

  const reports: FactReport[] = present.map((typ) => ({
    typ,
    rows: result![typ].rows.length,
    columnsOk:
      JSON.stringify(result![typ].columns) === JSON.stringify(FACT_COLUMNS[typ]),
    matrix:
      typ === "switches" || typ === "lamps"
        ? wouldRenderMatrix(result![typ])
        : null,
  }));
  for (const r of reports) {
    if (r.matrix === false) {
      warnings.push(
        `${LABEL[r.typ]}: rendert nicht als Matrix — prüfe „Column"/„Row" (1–9).`,
      );
    }
  }

  if (errors.length === 0 && present.length === 0) {
    errors.push("Keine Tabellen mit Zeilen gefunden — es gibt nichts zu importieren.");
  }

  const ok = errors.length === 0 && present.length > 0;
  return { ok, result: ok ? result : undefined, present, reports, warnings, errors };
}
