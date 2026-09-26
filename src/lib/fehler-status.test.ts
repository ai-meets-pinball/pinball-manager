import { describe, expect, it } from "vitest";
import { fehlerStatusNachReparatur } from "@/lib/fehler-status";

/*
  Eine Reparatur führt den Status ihrer verknüpften Fehler (Feedback 09/2026,
  Kai): „erledigt" → behoben, „in Arbeit" → in Arbeit — aber nur für Fehler,
  die noch nicht behoben sind. „offen" lässt die Fehler in Ruhe.
*/
describe("fehlerStatusNachReparatur", () => {
  it("erledigte Reparatur behebt jeden verknüpften Fehler", () => {
    expect(fehlerStatusNachReparatur("erledigt", "offen")).toBe("behoben");
    expect(fehlerStatusNachReparatur("erledigt", "quittiert")).toBe("behoben");
    expect(fehlerStatusNachReparatur("erledigt", "in Arbeit")).toBe("behoben");
    // Schon behoben: kein Update nötig.
    expect(fehlerStatusNachReparatur("erledigt", "behoben")).toBeNull();
  });

  it("Reparatur in Arbeit zieht offene und quittierte Fehler nach", () => {
    expect(fehlerStatusNachReparatur("in Arbeit", "offen")).toBe("in Arbeit");
    expect(fehlerStatusNachReparatur("in Arbeit", "quittiert")).toBe("in Arbeit");
  });

  it("Reparatur in Arbeit lässt in Arbeit und behoben unangetastet", () => {
    expect(fehlerStatusNachReparatur("in Arbeit", "in Arbeit")).toBeNull();
    expect(fehlerStatusNachReparatur("in Arbeit", "behoben")).toBeNull();
  });

  it("offene Reparatur ändert nie einen Fehler", () => {
    for (const s of ["offen", "quittiert", "in Arbeit", "behoben"] as const) {
      expect(fehlerStatusNachReparatur("offen", s)).toBeNull();
    }
  });
});
