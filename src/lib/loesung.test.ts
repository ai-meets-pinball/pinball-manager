import { describe, expect, it } from "vitest";
import { loesungAmFehler } from "@/lib/loesung";

const r = (id: string, status: string, tag: number, massnahme: string | null, diagnose: string | null = null) => ({
  id, status, datum: new Date(Date.UTC(2026, 9, tag)), massnahme, diagnose,
});

describe("loesungAmFehler", () => {
  it("ohne Reparatur: nichts", () => {
    expect(loesungAmFehler([])).toBeNull();
  });

  it("nimmt die Maßnahme der jüngsten erledigten Reparatur", () => {
    const l = loesungAmFehler([
      r("alt", "erledigt", 1, "Spule getauscht"),
      r("neu", "erledigt", 9, "Treiber-Transistor ersetzt"),
      r("offen", "in Arbeit", 12, "läuft noch"),
    ]);
    expect(l).toEqual({ repairId: "neu", art: "erledigt", text: "Treiber-Transistor ersetzt" });
  });

  it("ohne Maßnahme: die Diagnose", () => {
    expect(loesungAmFehler([r("a", "erledigt", 3, null, "Kabelbruch am Stecker J3")])?.text)
      .toBe("Kabelbruch am Stecker J3");
  });

  it("ohne erledigte Reparatur: die jüngste laufende, als solche gekennzeichnet", () => {
    expect(loesungAmFehler([r("a", "in Arbeit", 3, "Platine ist beim Löten")])).toEqual({
      repairId: "a", art: "in Arbeit", text: "Platine ist beim Löten",
    });
  });

  it("Reparatur ohne Text: Verweis bleibt, Text leer", () => {
    expect(loesungAmFehler([r("a", "erledigt", 3, "  ", null)])).toEqual({
      repairId: "a", art: "erledigt", text: "",
    });
  });

  it("kürzt lange Texte auf eine Zeile mit Auslassung", () => {
    const lang = "x".repeat(300);
    const t = loesungAmFehler([r("a", "erledigt", 3, lang)])!.text;
    expect(t.length).toBe(160);
    expect(t.endsWith("…")).toBe(true);
  });

  it("macht Zeilenumbrüche zu Leerzeichen", () => {
    expect(loesungAmFehler([r("a", "erledigt", 3, "ID isoliert.\nCode verschoben.")])!.text)
      .toBe("ID isoliert. Code verschoben.");
  });
});
