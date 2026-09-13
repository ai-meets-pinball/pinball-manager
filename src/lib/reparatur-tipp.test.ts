import { describe, expect, it } from "vitest";
import { befoerderbar, tippAusReparatur, type FreigabeKandidat } from "./reparatur-tipp";

const reparatur: FreigabeKandidat["reparatur"] = {
  datum: new Date(2026, 8, 13),
  diagnose: "Spule 12 durchgebrannt",
  massnahme: "Spule getauscht, Diode geprüft",
  teile: "Spule AE-23-800",
  kosten: "24.50",
  zeit: 45,
  faultBeschreibung: "Linker Slingshot feuert nicht",
  faultKategorie: "Elektrik",
};
const kandidat = (teil: Partial<FreigabeKandidat> = {}): FreigabeKandidat => ({
  scope: "platform",
  clubIds: [],
  anonym: true,
  zeigeKosten: false,
  reparatur,
  ...teil,
});

describe("befoerderbar", () => {
  it("platform wird öffentlich", () => {
    expect(befoerderbar({ scope: "platform", clubIds: [] })).toEqual({
      visibility: "oeffentlich",
      clubId: null,
    });
  });

  it("genau ein Club wird Club-Tipp mit diesem Club", () => {
    expect(befoerderbar({ scope: "club", clubIds: ["c1"] })).toEqual({
      visibility: "club",
      clubId: "c1",
    });
  });

  it("mehrere Clubs haben kein Gegenstück — erlischt", () => {
    expect(befoerderbar({ scope: "club", clubIds: ["c1", "c2"] })).toBeNull();
  });

  it("Club-Freigabe ohne Club (defekt) erlischt statt öffentlich zu werden", () => {
    expect(befoerderbar({ scope: "club", clubIds: [] })).toBeNull();
  });

  it("einzelne Personen haben kein Gegenstück — erlischt", () => {
    expect(befoerderbar({ scope: "users", clubIds: [] })).toBeNull();
  });
});

describe("tippAusReparatur", () => {
  it("baut Titel aus dem Symptom und den Text aus den gefüllten Feldern", () => {
    const { titel, inhalt } = tippAusReparatur(kandidat());
    expect(titel).toBe("Reparatur: Linker Slingshot feuert nicht");
    expect(inhalt.links).toEqual([]);
    expect(inhalt.text.split("\n")).toEqual([
      "Symptom: Linker Slingshot feuert nicht (Elektrik)",
      "Diagnose: Spule 12 durchgebrannt",
      "Maßnahme: Spule getauscht, Diode geprüft",
      "Teile: Spule AE-23-800",
      "Repariert am 13.09.2026.",
      "Übernommen aus einer Reparatur, als die Maschine gelöscht wurde.",
    ]);
  });

  it("nennt Kosten und Aufwand nur, wenn die Freigabe sie zeigte", () => {
    expect(tippAusReparatur(kandidat()).inhalt.text).not.toContain("Kosten");
    expect(tippAusReparatur(kandidat({ zeigeKosten: true })).inhalt.text).toContain(
      "Kosten: 24,50 € · Aufwand: 45 min",
    );
  });

  it("lässt leere Felder weg und fällt beim Titel auf Diagnose, dann Maßnahme zurück", () => {
    const ohneSymptom = tippAusReparatur(
      kandidat({ reparatur: { ...reparatur, faultBeschreibung: null, faultKategorie: null, teile: null } }),
    );
    expect(ohneSymptom.titel).toBe("Reparatur: Spule 12 durchgebrannt");
    expect(ohneSymptom.inhalt.text).not.toContain("Symptom");
    expect(ohneSymptom.inhalt.text).not.toContain("Teile");

    const nurMassnahme = tippAusReparatur(
      kandidat({
        reparatur: { ...reparatur, faultBeschreibung: null, faultKategorie: null, diagnose: null },
      }),
    );
    expect(nurMassnahme.titel).toBe("Reparatur: Spule getauscht, Diode geprüft");
  });

  it("hat auch ohne jede Beschreibung einen Titel", () => {
    const leer = tippAusReparatur(
      kandidat({
        reparatur: {
          ...reparatur,
          faultBeschreibung: null,
          faultKategorie: null,
          diagnose: null,
          massnahme: null,
        },
      }),
    );
    expect(leer.titel).toBe("Reparatur: ohne Beschreibung");
  });

  it("kürzt einen langen Titel auf 80 Zeichen mit Ellipse", () => {
    const lang = tippAusReparatur(
      kandidat({ reparatur: { ...reparatur, faultBeschreibung: "x".repeat(200) } }),
    );
    expect(lang.titel.length).toBe(80);
    expect(lang.titel.endsWith("…")).toBe(true);
  });
});
