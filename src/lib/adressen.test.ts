import { describe, expect, it } from "vitest";
import { MAX_ADRESSEN, parseAdressen } from "./adressen";

describe("parseAdressen", () => {
  it("trennt an Zeile, Komma und Semikolon, trimmt und schreibt klein", () => {
    const r = parseAdressen(" A@Example.de\nb@example.de, c@example.de ; d@example.de ");
    expect(r.gueltig).toEqual(["a@example.de", "b@example.de", "c@example.de", "d@example.de"]);
    expect(r.ungueltig).toEqual([]);
    expect(r.zuViele).toBe(0);
  });

  it("entfernt Doppelte (auch bei anderer Schreibweise)", () => {
    expect(parseAdressen("x@y.de\nX@Y.DE\nx@y.de").gueltig).toEqual(["x@y.de"]);
  });

  it("sammelt Ungültiges getrennt, ohne die Gültigen zu verlieren", () => {
    const r = parseAdressen("gut@ok.de\nkein-at\nauch@nicht\n@leer.de");
    expect(r.gueltig).toEqual(["gut@ok.de"]);
    expect(r.ungueltig).toEqual(["kein-at", "auch@nicht", "@leer.de"]);
  });

  it("ist bei leerer Eingabe leer", () => {
    expect(parseAdressen("")).toEqual({ gueltig: [], ungueltig: [], zuViele: 0 });
    expect(parseAdressen("\n\n , ;")).toEqual({ gueltig: [], ungueltig: [], zuViele: 0 });
  });

  it("kappt bei MAX_ADRESSEN und zählt den Rest", () => {
    const viele = Array.from({ length: MAX_ADRESSEN + 3 }, (_, i) => `n${i}@x.de`).join("\n");
    const r = parseAdressen(viele);
    expect(r.gueltig).toHaveLength(MAX_ADRESSEN);
    expect(r.zuViele).toBe(3);
  });
});
