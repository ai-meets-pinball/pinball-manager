import { describe, expect, it } from "vitest";
import { buildMatrix } from "@/lib/fakten-matrix";

/** Sega-/Whitestar-Lampenliste: 8 Spalten × 10 Reihen, fortlaufend 1–80. */
function segaLampen() {
  const rows: string[][] = [];
  for (let n = 1; n <= 80; n++) {
    const c = Math.ceil(n / 10);
    const r = ((n - 1) % 10) + 1;
    rows.push([String(n), String(c), String(r), `Lampe ${n}`]);
  }
  return { columns: ["Lamp/No", "Column", "Row", "Funktion"], rows };
}

describe("buildMatrix", () => {
  it("Sega 8×10 mit Spalte/Reihe: alle 10 Reihen bleiben drin (Space Jam)", () => {
    const m = buildMatrix(segaLampen());
    expect(m?.cols).toBe(8);
    expect(m?.rows).toBe(10);
    expect(m?.cells.size).toBe(80);
    expect(m?.cells.get("8-10")?.num).toBe("80");
  });

  it("fortlaufende Nummern sind KEINE Spalte×10+Reihe-Nummern", () => {
    expect(buildMatrix(segaLampen())?.nrIstSpalteReihe).toBe(false);
  });

  it("WPC-Nummern (11–88) aus Spalte/Reihe: Formel stimmt", () => {
    const rows = [11, 12, 21, 88].map((n) => [
      String(n),
      String(Math.floor(n / 10)),
      String(n % 10),
      `Lampe ${n}`,
    ]);
    const m = buildMatrix({ columns: ["Nr", "Spalte", "Reihe", "Name"], rows });
    expect(m).toMatchObject({ cols: 8, rows: 8, nrIstSpalteReihe: true });
  });

  it("ohne Spalte/Reihe: Position aus der Nummer, höchstens 9×9", () => {
    const rows = ["11", "12", "21", "99", "100"].map((n) => [n, `L${n}`]);
    const m = buildMatrix({ columns: ["Nr", "Name"], rows });
    expect(m?.cells.size).toBe(4);
    expect(m).toMatchObject({ cols: 9, rows: 9, nrIstSpalteReihe: true });
  });

  it("unsinnig große Spalte/Reihe wird verworfen", () => {
    const rows = [
      ["1", "1", "1", "a"],
      ["2", "1", "2", "b"],
      ["3", "2", "1", "c"],
      ["4", "2", "2", "d"],
      ["5", "40", "1", "kaputt"],
    ];
    const m = buildMatrix({ columns: ["Nr", "Column", "Row", "Name"], rows });
    expect(m?.cols).toBe(2);
    expect(m?.cells.size).toBe(4);
  });

  it("weniger als 4 Zellen ergeben keine Matrix", () => {
    const rows = [["11", "a"], ["12", "b"]];
    expect(buildMatrix({ columns: ["Nr", "Name"], rows })).toBeNull();
  });
});
