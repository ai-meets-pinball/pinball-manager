import { describe, expect, it } from "vitest";
import { baueNeuerFehlerNachricht } from "@/lib/whatsapp/nachricht";

const basis = {
  maschine: "Stern Godzilla",
  club: "FlipperFreunde Fellbach",
  beschreibung: "Linker Flipper ohne Funktion",
  url: "https://app.example/machines/abc?bereich=fehler",
};

describe("baueNeuerFehlerNachricht", () => {
  it("füllt die Template-Variablen in fester Reihenfolge", () => {
    const n = baueNeuerFehlerNachricht(basis);
    expect(n.templateVars).toEqual([
      "Stern Godzilla",
      "FlipperFreunde Fellbach",
      "Linker Flipper ohne Funktion",
      "https://app.example/machines/abc?bereich=fehler",
    ]);
    expect(n.anlass).toBe("neuer Fehler");
    expect(n.text).toContain("Stern Godzilla");
    expect(n.text).toContain(basis.url);
  });

  it("kürzt lange Beschreibungen und normalisiert Whitespace", () => {
    const lang = "x".repeat(200);
    const n = baueNeuerFehlerNachricht({
      ...basis,
      beschreibung: `  viel   Text\n${lang}`,
    });
    expect(n.templateVars[2].length).toBeLessThanOrEqual(140);
    expect(n.templateVars[2]).not.toContain("\n");
    expect(n.templateVars[2].startsWith("viel Text")).toBe(true);
  });

  it("fällt bei leerer Beschreibung auf einen Platzhalter zurück", () => {
    const n = baueNeuerFehlerNachricht({ ...basis, beschreibung: "   " });
    expect(n.templateVars[2]).toBe("(ohne Beschreibung)");
  });
});
