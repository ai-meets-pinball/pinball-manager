import { describe, expect, it } from "vitest";
import { parseFacts, parseFactsText, sliceJsonObject } from "@/lib/import-facts";
import { FACT_COLUMNS } from "@/lib/validators";

/*
  Diese Kette läuft jetzt für BEIDE Wege — eingefügtes JSON und KI-Antwort.
  Vorher bekam nur der Einfüge-Pfad die Normalisierung; die KI-Antwort ging roh
  in extractSchema.parse und scheiterte an genau den Fällen hier unten.
*/
const spulen = (rows: unknown[][], columns = FACT_COLUMNS.coils) => ({
  coils: { columns, rows },
});

describe("parseFacts", () => {
  it("nimmt eine saubere Tabelle an", () => {
    const r = parseFacts(spulen([["1", "Flipper links", "", "", "", ""]]));
    expect(r.ok).toBe(true);
    expect(r.present).toEqual(["coils"]);
    expect(r.result?.coils.rows).toEqual([["1", "Flipper links", "", "", "", ""]]);
  });

  it("füllt zu kurze Zeilen auf und sagt es", () => {
    // Der Fall, an dem die KI-Antwort vorher hart scheiterte.
    const r = parseFacts(spulen([["1", "Flipper links"]]));
    expect(r.ok).toBe(true);
    expect(r.result?.coils.rows[0]).toHaveLength(FACT_COLUMNS.coils.length);
    expect(r.warnings.join(" ")).toMatch(/aufgefüllt/);
  });

  it("setzt fehlende Spaltenüberschriften ein und sagt es", () => {
    const r = parseFacts({ coils: { rows: [["1", "a", "", "", "", ""]] } });
    expect(r.ok).toBe(true);
    expect(r.result?.coils.columns).toEqual(FACT_COLUMNS.coils);
    expect(r.warnings.join(" ")).toMatch(/Spaltenüberschriften fehlten/);
  });

  it("macht aus Zahlen und null saubere Strings", () => {
    const r = parseFacts(spulen([[1, null, "x", "", "", ""]]));
    expect(r.result?.coils.rows[0].slice(0, 3)).toEqual(["1", "", "x"]);
  });

  it("lehnt ab, wenn eine Zeile kein Array ist", () => {
    const r = parseFacts({ coils: { columns: FACT_COLUMNS.coils, rows: ["kaputt"] } });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/keine? Array|kein Array/i);
  });

  it("lehnt ab, wenn gar keine Tabelle Zeilen hat", () => {
    const r = parseFacts({ coils: { columns: [], rows: [] } });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/nichts zu importieren/);
  });

  it("lehnt Nicht-Objekte ab", () => {
    expect(parseFacts([]).ok).toBe(false);
    expect(parseFacts(null).ok).toBe(false);
    expect(parseFacts("text").ok).toBe(false);
  });

  it("warnt, wenn die Schaltermatrix nicht als Raster rendert", () => {
    // Ohne gültige Column/Row-Werte fällt die Matrixdarstellung aus — das ist
    // die Art Hinweis, die der KI-Pfad vorher nie zu sehen bekam.
    const r = parseFacts({
      switches: {
        columns: FACT_COLUMNS.switches,
        rows: [["1", "", "", "mechanisch", "Startknopf"]],
      },
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.join(" ")).toMatch(/Matrix/);
  });

  it("meldet eine echte Matrix nicht als Problem", () => {
    const rows = [11, 12, 21, 22].map((n) => [
      String(n),
      String(Math.floor(n / 10)),
      String(n % 10),
      "mechanisch",
      "x",
    ]);
    const r = parseFacts({ switches: { columns: FACT_COLUMNS.switches, rows } });
    expect(r.warnings.join(" ")).not.toMatch(/rendert nicht als Matrix/);
  });
});

describe("parseFactsText", () => {
  it("holt das JSON aus umrahmendem Text", () => {
    const roh = 'Gerne!\n```json\n{"coils":{"columns":[],"rows":[["1","a","","","",""]]}}\n```';
    expect(parseFactsText(roh).ok).toBe(true);
  });

  it("meldet fehlendes und kaputtes JSON getrennt", () => {
    expect(parseFactsText("nur prosa").errors.join(" ")).toMatch(
      /Kein JSON-Objekt gefunden/,
    );
    expect(parseFactsText("{kaputt").errors.join(" ")).toMatch(/Kein JSON-Objekt|gültiges JSON/);
  });

  it("verträgt leere Eingabe", () => {
    expect(parseFactsText("").ok).toBe(false);
  });
});

describe("sliceJsonObject", () => {
  it("schneidet auf das äußerste Objekt", () => {
    expect(sliceJsonObject('a {"x":{"y":1}} b')).toBe('{"x":{"y":1}}');
  });

  it("gibt null zurück, wenn nichts zu schneiden ist", () => {
    expect(sliceJsonObject("keine klammern")).toBeNull();
    expect(sliceJsonObject("}{")).toBeNull();
  });
});
