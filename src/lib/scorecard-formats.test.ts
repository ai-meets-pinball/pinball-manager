import { describe, expect, it } from "vitest";
import {
  SCORECARD_FORMATS,
  formatePassendZuHersteller,
} from "@/lib/scorecard-formats";

describe("SCORECARD_FORMATS", () => {
  it("hat eindeutige ids und positive Maße", () => {
    const ids = new Set<string>();
    for (const f of SCORECARD_FORMATS) {
      expect(f.id, `doppelte id: ${f.id}`).not.toBe(undefined);
      expect(ids.has(f.id), `doppelte id: ${f.id}`).toBe(false);
      ids.add(f.id);
      expect(f.breiteMm).toBeGreaterThan(0);
      expect(f.hoeheMm).toBeGreaterThan(0);
      expect(f.hersteller.length).toBeGreaterThan(0);
      expect(f.kartentyp.length).toBeGreaterThan(0);
    }
  });
});

describe("formatePassendZuHersteller", () => {
  it("findet Stern-Formate", () => {
    const treffer = formatePassendZuHersteller("Stern Pinball");
    expect(treffer.length).toBeGreaterThan(0);
    expect(
      treffer.every((f) => f.hersteller.toLowerCase().includes("stern")),
    ).toBe(true);
  });

  it("findet Williams-Formate (auch WPC-Familien)", () => {
    const treffer = formatePassendZuHersteller("Williams");
    expect(treffer.some((f) => f.id === "williams-em-instruction")).toBe(true);
    expect(treffer.some((f) => f.id === "williams-ss")).toBe(true);
  });

  it("liefert leer bei unbekanntem/leerem Hersteller", () => {
    expect(formatePassendZuHersteller("")).toEqual([]);
    expect(formatePassendZuHersteller(null)).toEqual([]);
    expect(formatePassendZuHersteller("Homebrew XYZ")).toEqual([]);
  });
});
