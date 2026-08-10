import { describe, expect, it } from "vitest";
import { istLeer, mergeFactResults } from "@/lib/manual-extract";
import { bereiche } from "@/lib/ai/prepare-document";
import { FACT_TYPES } from "@/lib/validators";

/*
  Das Zusammenführen der Pakete ist die Stelle, an der ein großes Handbuch
  gewinnt oder verliert: kommen die Zeilen aus zehn Batches sauber zusammen,
  ohne die wiederholten Kopfzeilen zu verdoppeln? Vorher war die Funktion nicht
  exportiert und damit nur über einen echten Extraktionslauf prüfbar.
*/
const leer = () => ({ columns: [] as string[], rows: [] as string[][] });

function ergebnis(
  teil: Partial<Record<(typeof FACT_TYPES)[number], { columns: string[]; rows: string[][] }>>,
) {
  return {
    coils: leer(),
    switches: leer(),
    lamps: leer(),
    fuses: leer(),
    parts: leer(),
    rules: leer(),
    ...teil,
  };
}

describe("mergeFactResults", () => {
  it("hängt die Zeilen mehrerer Pakete aneinander", () => {
    const m = mergeFactResults([
      ergebnis({ coils: { columns: ["Sol/No", "Funktion"], rows: [["1", "Flipper links"]] } }),
      ergebnis({ coils: { columns: ["Sol/No", "Funktion"], rows: [["2", "Flipper rechts"]] } }),
    ]);
    expect(m.coils.rows).toEqual([
      ["1", "Flipper links"],
      ["2", "Flipper rechts"],
    ]);
  });

  it("wirft identische Zeilen weg — wiederholte Kopfzeilen je Batch", () => {
    const kopf = ["1", "Flipper links"];
    const m = mergeFactResults([
      ergebnis({ coils: { columns: ["Sol/No", "Funktion"], rows: [kopf, ["2", "Slingshot"]] } }),
      ergebnis({ coils: { columns: ["Sol/No", "Funktion"], rows: [kopf, ["3", "Pop-Bumper"]] } }),
    ]);
    expect(m.coils.rows).toEqual([
      ["1", "Flipper links"],
      ["2", "Slingshot"],
      ["3", "Pop-Bumper"],
    ]);
  });

  it("nimmt die Spaltenüberschriften vom ersten Paket, das welche hat", () => {
    const m = mergeFactResults([
      ergebnis({ coils: { columns: [], rows: [["1", "a"]] } }),
      ergebnis({ coils: { columns: ["Sol/No", "Funktion"], rows: [["2", "b"]] } }),
    ]);
    expect(m.coils.columns).toEqual(["Sol/No", "Funktion"]);
  });

  it("hält die Tabellenarten auseinander", () => {
    const m = mergeFactResults([
      ergebnis({ coils: { columns: ["Sol/No"], rows: [["1"]] } }),
      ergebnis({ fuses: { columns: ["Board"], rows: [["CPU"]] } }),
    ]);
    expect(m.coils.rows).toEqual([["1"]]);
    expect(m.fuses.rows).toEqual([["CPU"]]);
    expect(m.switches.rows).toEqual([]);
  });

  it("ergibt aus lauter leeren Paketen ein leeres Ergebnis", () => {
    expect(istLeer(mergeFactResults([ergebnis({}), ergebnis({})]))).toBe(true);
    expect(istLeer(mergeFactResults([]))).toBe(true);
  });

  it("gilt als nicht leer, sobald irgendeine Tabelle eine Zeile hat", () => {
    expect(istLeer(ergebnis({ rules: { columns: ["Adj/No"], rows: [["1"]] } }))).toBe(
      false,
    );
  });
});

describe("bereiche", () => {
  it("zerlegt in Gruppen und lässt die letzte kürzer", () => {
    expect(bereiche(25, 10)).toEqual([
      { von: 1, bis: 10 },
      { von: 11, bis: 20 },
      { von: 21, bis: 25 },
    ]);
  });

  it("liefert bei genau aufgehender Teilung volle Gruppen", () => {
    expect(bereiche(20, 10)).toEqual([
      { von: 1, bis: 10 },
      { von: 11, bis: 20 },
    ]);
  });

  it("kommt mit einer einzelnen Seite und mit null Seiten klar", () => {
    expect(bereiche(1, 6)).toEqual([{ von: 1, bis: 1 }]);
    expect(bereiche(0, 6)).toEqual([]);
  });
});
