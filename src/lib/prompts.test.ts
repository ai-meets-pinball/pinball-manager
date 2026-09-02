import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROMPTS,
  extractSpaltenBlock,
  renderPrompt,
  waehleVorlage,
  type OverrideRow,
  fehlendePlatzhalter,
  overrideBelegt,
} from "@/lib/prompts";

describe("renderPrompt", () => {
  it("ersetzt Platzhalter und entfernt unbekannte", () => {
    expect(
      renderPrompt("Hersteller: {{hersteller}}, {{unbekannt}}", {
        hersteller: "Bally",
      }),
    ).toBe("Hersteller: Bally, ");
  });
});

describe("extractSpaltenBlock", () => {
  it("enthält die Fakten-Spalten", () => {
    const b = extractSpaltenBlock();
    expect(b).toContain("coils");
    expect(b).toContain("Wire");
    expect(b).toContain("switches");
  });
});

describe("waehleVorlage", () => {
  const O = (
    hersteller: string | null,
    generationId: string | null,
    vorlage: string,
  ): OverrideRow => ({ hersteller, generationId, vorlage });

  it("Standard, wenn keine Overrides", () => {
    const r = waehleVorlage("guide_system", [], {});
    expect(r.quelle).toBe("standard");
    expect(r.vorlage).toBe(DEFAULT_PROMPTS.guide_system.vorlage);
  });

  it("global, wenn nur globaler Override existiert", () => {
    const r = waehleVorlage("extract", [O(null, null, "GLOBAL")], {
      hersteller: "Stern",
    });
    expect(r).toEqual({ vorlage: "GLOBAL", quelle: "global" });
  });

  it("Hersteller schlägt global", () => {
    const rows = [O(null, null, "GLOBAL"), O("Bally", null, "BALLY")];
    const r = waehleVorlage("guide_system", rows, { hersteller: "Bally" });
    expect(r).toEqual({ vorlage: "BALLY", quelle: "hersteller" });
  });

  it("Generation schlägt Hersteller und global", () => {
    const rows = [
      O(null, null, "GLOBAL"),
      O("Bally", null, "BALLY"),
      O(null, "gen-1", "GEN"),
    ];
    const r = waehleVorlage("guide_system", rows, {
      hersteller: "Bally",
      generationId: "gen-1",
    });
    expect(r).toEqual({ vorlage: "GEN", quelle: "generation" });
  });

  it("Hersteller-Override greift NICHT ohne passenden Hersteller", () => {
    const rows = [O("Bally", null, "BALLY")];
    const r = waehleVorlage("guide_system", rows, { hersteller: "Williams" });
    expect(r.quelle).toBe("standard");
  });
});

describe("fehlendePlatzhalter", () => {
  it("nennt genau die Platzhalter, die im Text fehlen", () => {
    expect(fehlendePlatzhalter("Hallo {{modell}}", ["{{hersteller}}", "{{modell}}"])).toEqual([
      "{{hersteller}}",
    ]);
    expect(fehlendePlatzhalter("{{a}} {{b}}", ["{{a}}", "{{b}}"])).toEqual([]);
    expect(fehlendePlatzhalter("", [])).toEqual([]);
  });
});

describe("overrideBelegt", () => {
  const rows = [
    { hersteller: "Bally", generationId: null, vorlage: "x" },
    { hersteller: null, generationId: "g1", vorlage: "y" },
  ];
  it("erkennt belegte und freie Bereiche exakt", () => {
    expect(overrideBelegt(rows, { hersteller: "Bally", generationId: null })).toBe(true);
    expect(overrideBelegt(rows, { hersteller: null, generationId: "g1" })).toBe(true);
    expect(overrideBelegt(rows, { hersteller: "Stern", generationId: null })).toBe(false);
    expect(overrideBelegt(rows, { hersteller: null, generationId: null })).toBe(false);
  });
});
