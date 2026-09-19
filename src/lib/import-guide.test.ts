import { describe, expect, it } from "vitest";
import { bereinigeZitate, parseGuide, parseGuideText } from "@/lib/import-guide";

/*
  Auch der Guide läuft jetzt für beide Wege durch dieselbe Prüfung. Die
  Vollständigkeits-Hinweise (zu wenige Abschnitte, leere Abschnitte, keine
  Quellen) sah vorher nur, wer das JSON von Hand einfügte.
*/
const abschnitt = (titel: string, leer = false) => ({
  titel,
  bloecke: leer ? [] : [{ typ: "text", text: "Inhalt …" }],
});

const guide = (opts: { abschnitte?: number; quellen?: string[]; plattform?: string } = {}) => ({
  plattform: opts.plattform ?? "Williams WPC-95",
  abschnitte: Array.from({ length: opts.abschnitte ?? 7 }, (_, i) =>
    abschnitt(`${i + 1}. Abschnitt`),
  ),
  quellen: opts.quellen ?? ["IPDB 4032"],
});

describe("parseGuide", () => {
  it("nimmt einen vollständigen Guide ohne Hinweise an", () => {
    const r = parseGuide(guide());
    expect(r.ok).toBe(true);
    expect(r.abschnitte).toBe(7);
    expect(r.warnings).toEqual([]);
  });

  it("packt einen versehentlich eingefügten Umschlag aus", () => {
    const r = parseGuide({ guide: guide(), websuche: true, model: "claude-sonnet-5" });
    expect(r.ok).toBe(true);
    expect(r.warnings.join(" ")).toMatch(/Umschlag/);
  });

  it("warnt bei weniger als sieben Abschnitten", () => {
    const r = parseGuide(guide({ abschnitte: 3 }));
    expect(r.ok).toBe(true);
    expect(r.warnings.join(" ")).toMatch(/Nur 3 Abschnitte/);
  });

  it("nennt Abschnitte ohne Inhalt beim Namen", () => {
    const g = guide();
    g.abschnitte[2] = abschnitt("3. Leer", true);
    const r = parseGuide(g);
    expect(r.warnings.join(" ")).toMatch(/3. Leer/);
  });

  it("warnt bei fehlenden Quellen und fehlender Plattform", () => {
    const r = parseGuide(guide({ quellen: [], plattform: "  " }));
    expect(r.warnings.join(" ")).toMatch(/Keine Quellen/);
    expect(r.warnings.join(" ")).toMatch(/Keine Plattform/);
  });

  it("lehnt einen Guide ohne Abschnitte ab", () => {
    const r = parseGuide(guide({ abschnitte: 0 }));
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/keine Abschnitte/);
  });

  it("lehnt fremde Strukturen mit Pfadangabe ab", () => {
    const r = parseGuide({ plattform: "x", abschnitte: "keine Liste", quellen: [] });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/Guide-Struktur/);
  });

  it("zählt Blöcke und Tabellen", () => {
    const r = parseGuide({
      plattform: "P",
      abschnitte: [
        {
          titel: "1",
          bloecke: [
            { typ: "text", text: "a" },
            { typ: "tabelle", titel: "T", spalten: ["A"], zeilen: [["1"]] },
          ],
        },
      ],
      quellen: ["q"],
    });
    expect(r.bloecke).toBe(2);
    expect(r.tabellen).toBe(1);
  });
});

describe("parseGuideText", () => {
  it("holt das JSON aus umrahmendem Text", () => {
    expect(parseGuideText(`Bitte sehr:\n${JSON.stringify(guide())}`).ok).toBe(true);
  });

  it("meldet fehlendes JSON", () => {
    expect(parseGuideText("nur prosa").errors.join(" ")).toMatch(
      /Kein JSON-Objekt gefunden/,
    );
  });
});

/*
  Zitier-Reste externer Modelle („filecite…" in Private-Use-Zeichen) dürfen
  nicht im Guide landen — gesehen im importierten Heighway-Alien-Guide.
*/
describe("bereinigeZitate", () => {
  const marker = "fileciteturn4file0L39-L67";

  it("entfernt einen Marker mitten im Text samt Folge-Leerzeichen", () => {
    expect(bereinigeZitate(`Alien ist ein Solid-State-Gerät. ${marker} Weiter.`)).toBe(
      "Alien ist ein Solid-State-Gerät. Weiter.",
    );
  });

  it("entfernt mehrere Marker am Ende und vor Satzzeichen", () => {
    expect(bereinigeZitate(`Netzstecker ziehen ${marker} ${marker}.`)).toBe(
      "Netzstecker ziehen.",
    );
  });

  it("wirft übrige Private-Use-Zeichen weg, lässt normalen Text unverändert", () => {
    expect(bereinigeZitate("Abc – Umlaute äöü bleiben.")).toBe(
      "Abc – Umlaute äöü bleiben.",
    );
    expect(bereinigeZitate("Nichts zu tun.")).toBe("Nichts zu tun.");
  });
});

describe("parseGuide bereinigt Zitier-Reste", () => {
  it("in Plattform, Blöcken und Quellen", () => {
    const marker = "fileciteturn1file0L1-L2";
    const r = parseGuide({
      plattform: `WPC-95 ${marker}`,
      abschnitte: [
        {
          titel: "1. Sicherheit",
          bloecke: [{ typ: "warnung", text: `Netz aus. ${marker}` }],
        },
      ],
      quellen: [`Manual ${marker}`],
    });
    expect(r.ok).toBe(true);
    expect(r.guide?.plattform).toBe("WPC-95");
    expect(r.guide?.abschnitte[0].bloecke[0]).toEqual({
      typ: "warnung",
      text: "Netz aus.",
    });
    expect(r.guide?.quellen).toEqual(["Manual"]);
  });
});
