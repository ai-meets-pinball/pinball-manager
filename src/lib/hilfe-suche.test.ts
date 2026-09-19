import { describe, expect, it } from "vitest";
import { filtereHilfe } from "@/lib/hilfe-suche";
import type { HilfeSektion } from "@/lib/help-content";

const sektionen: HilfeSektion[] = [
  {
    key: "fehler",
    titel: "Fehler melden",
    einleitung: "Symptome festhalten.",
    schritte: [
      { titel: "Neuer Fehler", text: "Beschreibung eingeben." },
      { text: "Priorität wählen." },
    ],
  },
  {
    key: "wartung",
    titel: "Wartungsplan",
    einleitung: "Intervalle je Gerät.",
    schritte: [
      { titel: "Aufgabe anlegen", text: "Intervall in Tagen." },
      { text: "Erledigt melden — der nächste Termin rückt nach." },
    ],
  },
];

describe("filtereHilfe", () => {
  it("liefert ohne Suchbegriff alles unverändert", () => {
    expect(filtereHilfe(sektionen, "")).toEqual(sektionen);
    expect(filtereHilfe(sektionen, "   ")).toEqual(sektionen);
  });

  it("liefert ohne Treffer eine leere Liste", () => {
    expect(filtereHilfe(sektionen, "Maschiene")).toEqual([]);
  });

  it("behält eine Sektion komplett, wenn der Titel trifft", () => {
    const r = filtereHilfe(sektionen, "wartungs");
    expect(r).toHaveLength(1);
    expect(r[0].key).toBe("wartung");
    expect(r[0].schritte).toHaveLength(2);
  });

  it("reduziert auf die passenden Schritte, wenn nur ein Schritt trifft", () => {
    const r = filtereHilfe(sektionen, "Termin");
    expect(r).toHaveLength(1);
    expect(r[0].key).toBe("wartung");
    expect(r[0].schritte).toEqual([
      { text: "Erledigt melden — der nächste Termin rückt nach." },
    ]);
  });

  it("ignoriert Groß-/Kleinschreibung und findet auch Schritt-Titel", () => {
    const r = filtereHilfe(sektionen, "NEUER FEHLER");
    expect(r.map((s) => s.key)).toEqual(["fehler"]);
  });

  it("verändert die Eingabe nicht", () => {
    const vorher = JSON.stringify(sektionen);
    filtereHilfe(sektionen, "Termin");
    expect(JSON.stringify(sektionen)).toBe(vorher);
  });
});
