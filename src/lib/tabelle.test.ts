import { describe, expect, it } from "vitest";
import { spalteEinheitlich } from "./tabelle";

type Zeile = { club: string | null };
const club = (z: Zeile) => z.club ?? "privat";

describe("spalteEinheitlich", () => {
  it("ist bei leerer Liste falsch — es gibt nichts auszublenden", () => {
    expect(spalteEinheitlich([], club)).toBe(false);
  });

  it("ist bei EINER Zeile falsch — dort trägt die Spalte die einzige Auskunft", () => {
    expect(spalteEinheitlich([{ club: "Fellbach" }], club)).toBe(false);
  });

  it("ist wahr, wenn alle Zeilen denselben Wert tragen", () => {
    expect(
      spalteEinheitlich([{ club: "Fellbach" }, { club: "Fellbach" }], club),
    ).toBe(true);
  });

  it("ist falsch, sobald eine Zeile abweicht", () => {
    expect(
      spalteEinheitlich(
        [{ club: "Fellbach" }, { club: "Fellbach" }, { club: "Ruhr" }],
        club,
      ),
    ).toBe(false);
  });

  it("behandelt den über den Accessor gesetzten Ersatzwert wie jeden anderen", () => {
    expect(spalteEinheitlich([{ club: null }, { club: null }], club)).toBe(true);
    expect(
      spalteEinheitlich([{ club: null }, { club: "Fellbach" }], club),
    ).toBe(false);
  });
});
