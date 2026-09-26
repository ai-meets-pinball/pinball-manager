import { describe, expect, it } from "vitest";
import { heuteUtc, zeitraumAb, zeitraumAusParam } from "@/lib/nutzung";

const jetzt = new Date("2026-09-26T10:30:00Z");

describe("zeitraumAusParam", () => {
  it("nimmt gültige Werte und fällt sonst auf 30 Tage zurück", () => {
    expect(zeitraumAusParam("7")).toBe("7");
    expect(zeitraumAusParam("alle")).toBe("alle");
    expect(zeitraumAusParam("14")).toBe("30");
    expect(zeitraumAusParam(undefined)).toBe("30");
  });
});

describe("zeitraumAb", () => {
  it("rechnet Tage zurück", () => {
    expect(zeitraumAb("7", jetzt)?.toISOString()).toBe("2026-09-19T10:30:00.000Z");
    expect(zeitraumAb("90", jetzt)?.toISOString()).toBe("2026-06-28T10:30:00.000Z");
  });

  it("liefert null für „alle“ (kein Filter)", () => {
    expect(zeitraumAb("alle", jetzt)).toBeNull();
  });
});

describe("heuteUtc", () => {
  it("nimmt den UTC-Kalendertag, nicht die lokale Zeit", () => {
    expect(heuteUtc(jetzt)).toBe("2026-09-26");
    // 23:30 UTC ist in Berlin schon der 27. — gezählt wird trotzdem der 26.
    expect(heuteUtc(new Date("2026-09-26T23:30:00Z"))).toBe("2026-09-26");
    expect(heuteUtc(new Date("2026-09-26T00:10:00Z"))).toBe("2026-09-26");
  });
});
