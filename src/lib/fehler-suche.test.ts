import { describe, expect, it } from "vitest";
import { fehlerPasst, type SuchbarerFehler } from "@/lib/fehler-suche";

const fehler = (teil: Partial<SuchbarerFehler> = {}): SuchbarerFehler => ({
  beschreibung: "Linker Flipper schwach",
  kategorie: "Flipperfinger",
  reparaturen: [],
  ...teil,
});

describe("fehlerPasst", () => {
  it("leerer oder nur aus Leerzeichen bestehender Begriff → alles passt", () => {
    expect(fehlerPasst(fehler(), "")).toBe(true);
    expect(fehlerPasst(fehler(), "   ")).toBe(true);
  });

  it("trifft das Symptom, unabhängig von Groß-/Kleinschreibung", () => {
    expect(fehlerPasst(fehler(), "FLIPPER schw")).toBe(true);
  });

  it("trifft die Kategorie", () => {
    expect(fehlerPasst(fehler({ beschreibung: "geht nicht" }), "finger")).toBe(true);
  });

  it("trifft Diagnose oder Maßnahme einer verknüpften Reparatur", () => {
    const f = fehler({
      reparaturen: [
        { diagnose: null, massnahme: null },
        { diagnose: "EOS-Schalter verbogen", massnahme: "Spulenhülse getauscht" },
      ],
    });
    expect(fehlerPasst(f, "eos")).toBe(true);
    expect(fehlerPasst(f, "spulenhülse")).toBe(true);
  });

  it("passt nicht, wenn der Begriff nirgends steht", () => {
    const f = fehler({ reparaturen: [{ diagnose: "Kabel lose", massnahme: null }] });
    expect(fehlerPasst(f, "Gummi")).toBe(false);
  });

  it("keine Normalisierung über Groß/klein hinaus (wie die Hilfe-Suche)", () => {
    expect(fehlerPasst(fehler(), "Fliper")).toBe(false);
  });
});
