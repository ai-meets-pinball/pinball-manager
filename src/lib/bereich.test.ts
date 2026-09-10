import { describe, expect, it } from "vitest";
import { bereichKeys } from "./bereich";

const gueltig = new Set(["privat", "club-a", "club-b"]);

describe("bereichKeys", () => {
  it("liefert bei fehlendem Wert alle Bereiche — kein Filter", () => {
    expect(bereichKeys(undefined, gueltig)).toEqual([]);
  });

  it("liefert bei leerem Wert alle Bereiche", () => {
    expect(bereichKeys("", gueltig)).toEqual([]);
  });

  it("nimmt die gültigen Schlüssel aus der Liste", () => {
    expect(bereichKeys("privat,club-b", gueltig)).toEqual(["privat", "club-b"]);
  });

  it("wirft unbekannte Schlüssel weg", () => {
    expect(bereichKeys("privat,club-weg", gueltig)).toEqual(["privat"]);
  });

  it("entfernt Duplikate, behält die Reihenfolge", () => {
    expect(bereichKeys("club-a,privat,club-a", gueltig)).toEqual([
      "club-a",
      "privat",
    ]);
  });

  it("liefert leer, wenn NUR Unbekanntes drinsteht — also wieder alle", () => {
    expect(bereichKeys("weg,auch-weg", gueltig)).toEqual([]);
  });

  it("verträgt Leerzeichen und leere Segmente", () => {
    expect(bereichKeys(" privat , ,club-a ", gueltig)).toEqual([
      "privat",
      "club-a",
    ]);
  });
});
