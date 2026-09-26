import { describe, expect, it } from "vitest";
import { besitzerLoeschenGesperrt, zusammengefuehrt } from "@/lib/besitzer";

describe("zusammengefuehrt", () => {
  it("das Ziel gewinnt, die Quelle füllt Lücken", () => {
    expect(
      zusammengefuehrt(
        { email: "ziel@example.org", userId: null },
        { email: "quelle@example.org", userId: "u1" },
      ),
    ).toEqual({ email: "ziel@example.org", userId: "u1" });
  });

  it("bleibt leer, wenn beide nichts wissen", () => {
    expect(
      zusammengefuehrt({ email: null, userId: null }, { email: null, userId: null }),
    ).toEqual({ email: null, userId: null });
  });

  it("gleiches Konto auf beiden Seiten ist kein Konflikt", () => {
    expect(
      zusammengefuehrt({ email: null, userId: "u1" }, { email: "a@b.c", userId: "u1" }),
    ).toEqual({ email: "a@b.c", userId: "u1" });
  });

  it("zwei verschiedene Konten lassen sich nicht zusammenführen", () => {
    const r = zusammengefuehrt(
      { email: null, userId: "u1" },
      { email: null, userId: "u2" },
    );
    expect("error" in r).toBe(true);
  });
});

describe("besitzerLoeschenGesperrt", () => {
  it("frei ohne Maschinen, gesperrt mit Grund und Zahl", () => {
    expect(besitzerLoeschenGesperrt(0)).toBeNull();
    expect(besitzerLoeschenGesperrt(1)).toMatch(/1 Maschine —/);
    expect(besitzerLoeschenGesperrt(3)).toMatch(/3 Maschinen —/);
  });
});
