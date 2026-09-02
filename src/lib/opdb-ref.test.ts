import { describe, expect, it } from "vitest";
import {
  familienSchluessel,
  familienVertreter,
  gruppiereNachFamilie,
  istBaugleich,
  parseOpdbRef,
} from "@/lib/opdb-ref";

/*
  OPDB-Referenzen: Gruppe-Maschine[-Alias]. Nur die ersten zwei Segmente sind
  technisch relevant — alle Zeilen mit gleichem Familienschlüssel sind baugleich
  (Editionen derselben Maschine) und teilen ihr Wissen.
*/
describe("parseOpdbRef", () => {
  it("zerlegt 1, 2 und 3 Segmente", () => {
    expect(parseOpdbRef("GV8wB")).toEqual({
      ref: "GV8wB",
      groupRef: "GV8wB",
      machineRef: null,
      istGruppe: true,
      istAlias: false,
    });
    expect(parseOpdbRef("GV8wB-MRjKd")).toEqual({
      ref: "GV8wB-MRjKd",
      groupRef: "GV8wB",
      machineRef: "GV8wB-MRjKd",
      istGruppe: false,
      istAlias: false,
    });
    expect(parseOpdbRef(" GV8wB-MRjKd-ARz2r ")).toEqual({
      ref: "GV8wB-MRjKd-ARz2r",
      groupRef: "GV8wB",
      machineRef: "GV8wB-MRjKd",
      istGruppe: false,
      istAlias: true,
    });
  });

  it("liefert null bei leer und verwirft leere Segmente wie split_part", () => {
    expect(parseOpdbRef("")).toBeNull();
    expect(parseOpdbRef("   ")).toBeNull();
    expect(parseOpdbRef(null)).toBeNull();
    expect(parseOpdbRef(undefined)).toBeNull();
    // Doppelter Bindestrich: zweites Segment leer → keine Maschine.
    expect(parseOpdbRef("GV8wB--X")?.machineRef).toBeNull();
    expect(parseOpdbRef("-MRjKd")).toBeNull();
  });
});

describe("familienSchluessel / istBaugleich", () => {
  it("LE und Premium/LE sind baugleich, Pro nicht", () => {
    expect(familienSchluessel("GV8wB-MRjKd-ARz2r")).toBe("GV8wB-MRjKd");
    expect(familienSchluessel("GV8wB-MRjKd")).toBe("GV8wB-MRjKd");
    expect(familienSchluessel("GV8wB")).toBeNull();
    expect(istBaugleich("GV8wB-MRjKd-ARz2r", "GV8wB-MRjKd-AOVy7")).toBe(true);
    expect(istBaugleich("GV8wB-MRjKd-ARz2r", "GV8wB-MRjKd")).toBe(true);
    expect(istBaugleich("GV8wB-MRjKd", "GV8wB-Mq12N")).toBe(false);
  });

  it("Gruppen- oder fehlende Referenzen sind mit nichts baugleich", () => {
    expect(istBaugleich("GV8wB", "GV8wB-MRjKd")).toBe(false);
    expect(istBaugleich("GV8wB", "GV8wB")).toBe(false);
    expect(istBaugleich(null, "GV8wB-MRjKd")).toBe(false);
    expect(istBaugleich("GV8wB-MRjKd", undefined)).toBe(false);
  });
});

const le = { id: "1", opdbRef: "GV8wB-MRjKd-ARz2r", modell: "Pokémon (LE)" };
const premium = { id: "2", opdbRef: "GV8wB-MRjKd-AOVy7", modell: "Pokémon (Premium)" };
const premiumLe = { id: "3", opdbRef: "GV8wB-MRjKd", modell: "Pokémon (Premium/LE)" };
const pro = { id: "4", opdbRef: "GV8wB-Mq12N", modell: "Pokémon (Pro)" };
const kaputt = { id: "5", opdbRef: "XYZ", modell: "Unbekannt" };

describe("familienVertreter", () => {
  it("bevorzugt die zweisegmentige (editionsneutrale) Zeile", () => {
    expect(familienVertreter([le, premium, premiumLe])).toBe(premiumLe);
  });
  it("fällt sonst auf den kürzesten Namen zurück, deterministisch", () => {
    expect(familienVertreter([premium, le])).toBe(le);
    const a = { id: "a", opdbRef: "G-M-B", modell: "Gleich" };
    const b = { id: "b", opdbRef: "G-M-A", modell: "Gleich" };
    expect(familienVertreter([a, b])).toBe(b);
    expect(familienVertreter([b, a])).toBe(b);
  });
});

describe("gruppiereNachFamilie", () => {
  it("bündelt Editionen, trennt Pro, lässt kaputte Referenzen allein", () => {
    const familien = gruppiereNachFamilie([pro, le, kaputt, premiumLe, premium]);
    expect(familien.map((f) => f.vertreter.id)).toEqual(["3", "4", "5"]);
    expect(familien[0].mitglieder.map((m) => m.id).sort()).toEqual(["1", "2", "3"]);
    expect(familien[1].mitglieder).toEqual([pro]);
    expect(familien[2].mitglieder).toEqual([kaputt]);
  });
});
