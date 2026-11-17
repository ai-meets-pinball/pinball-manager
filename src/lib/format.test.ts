import { describe, expect, it } from "vitest";
import { datumDE, datumISO } from "@/lib/format";

describe("datumISO", () => {
  it("nimmt das lokale Datum, nicht UTC", () => {
    // 23:30 Ortszeit — toISOString() würde je nach Zone den Vortag/Folgetag liefern.
    const d = new Date(2026, 8, 2, 23, 30);
    expect(datumISO(d)).toBe("2026-09-02");
    expect(datumISO(new Date(2026, 0, 5, 0, 10))).toBe("2026-01-05");
  });
});

describe("datumDE", () => {
  it("JJJJ-MM-TT → TT.MM.JJJJ, ohne Umweg über Date (keine Zeitzone)", () => {
    expect(datumDE("2024-03-07")).toBe("07.03.2024");
    expect(datumDE("1999-12-31")).toBe("31.12.1999");
  });
});
