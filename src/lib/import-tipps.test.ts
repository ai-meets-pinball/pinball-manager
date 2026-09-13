import { describe, expect, it } from "vitest";
import { parseFactsText } from "./import-facts";
import { parseGuideText } from "./import-guide";
import { siehtAbgeschnittenAus, tippsFuerFakten, tippsFuerGuide } from "./import-tipps";
import { FACT_COLUMNS } from "./validators";

const tabelle = (typ: keyof typeof FACT_COLUMNS, zeilen: string[][]) =>
  `"${typ}": ${JSON.stringify({ columns: FACT_COLUMNS[typ], rows: zeilen })}`;
const spule = Array.from({ length: FACT_COLUMNS.coils.length }, (_, i) => `c${i}`);
const sicherung = Array.from({ length: FACT_COLUMNS.fuses.length }, (_, i) => `f${i}`);

describe("siehtAbgeschnittenAus", () => {
  it("erkennt eine offene Klammer bzw. ein fehlendes Ende", () => {
    expect(siehtAbgeschnittenAus('{"coils": {"columns": ["a"], "rows": [["1"')).toBe(true);
    expect(siehtAbgeschnittenAus('```json\n{"a": 1}\n```')).toBe(false);
    expect(siehtAbgeschnittenAus("kein json")).toBe(false);
  });
});

describe("tippsFuerFakten", () => {
  it("sagt bei leerer Eingabe nichts", () => {
    expect(tippsFuerFakten("", parseFactsText(""))).toEqual({ tipps: [], nachfrage: null });
  });

  it("erkennt eine abgeschnittene Ausgabe und schlägt zwei Teile vor", () => {
    const raw = `{${tabelle("coils", [spule])}, "switches": {"columns": ["Sw"], "rows": [["1`;
    const t = tippsFuerFakten(raw, parseFactsText(raw));
    expect(t.tipps[0]).toMatch(/abgeschnitten/);
    expect(t.nachfrage).toMatch(/zwei Teilen/);
    expect(t.nachfrage).toMatch(/^Deine letzte Antwort hatte folgende Probleme:/);
  });

  it("erkennt den Abbruch auch, wenn noch keine Klammer geschlossen wurde", () => {
    const raw = '{"coils": {"columns": ["Sol/No", "Funktion"], "rows": [["1", "Flipper';
    const t = tippsFuerFakten(raw, parseFactsText(raw));
    expect(t.tipps[0]).toMatch(/abgeschnitten/);
    expect(t.nachfrage).toMatch(/zwei Teilen/);
  });

  it("unterscheidet Fließtext von beschädigtem JSON", () => {
    const prosa = tippsFuerFakten("Hier die Spulen: 1, 2, 3", parseFactsText("Hier die Spulen: 1, 2, 3"));
    expect(prosa.tipps[0]).toMatch(/kein JSON/);
    const kaputt = '{"coils": {"columns": ["a"], "rows": [["1"]], /* … */}}';
    const k = tippsFuerFakten(kaputt, parseFactsText(kaputt));
    expect(k.tipps[0]).toMatch(/beschädigt/);
  });

  it("erkennt ein einzelnes Array als „nur eine Tabelle kopiert“", () => {
    const raw = '[["1", "Flipper links"]]';
    const t = tippsFuerFakten(raw, parseFactsText(raw));
    expect(t.tipps[0]).toMatch(/nur eine Tabelle/);
    expect(t.nachfrage).toMatch(/neun Schlüsseln/);
  });

  it("deutet lauter leere Tabellen als fehlendes PDF", () => {
    const raw = `{${tabelle("coils", [])}}`;
    const t = tippsFuerFakten(raw, parseFactsText(raw));
    expect(t.tipps[0]).toMatch(/Handbuch wirklich angehängt/);
    expect(t.nachfrage).toMatch(/fülle die rows/);
  });

  it("bittet bei nur einer Kern-Tabelle um die übrigen", () => {
    const raw = `{${tabelle("coils", [spule])}}`;
    const t = tippsFuerFakten(raw, parseFactsText(raw));
    expect(t.tipps[0]).toMatch(/Schalter-Matrix, Lampen-Matrix, Sicherungen/);
    expect(t.nachfrage).toMatch(/switches, lamps, fuses/);
  });

  it("verlangt bei abweichenden Spalten die kanonischen — der Import bleibt möglich", () => {
    const raw = `{${tabelle("coils", [spule])}, ${tabelle("fuses", [sicherung])}, ${tabelle("switches", [["a"]])}, "lamps": {"columns": ["X", "Y"], "rows": [["1", "2"]]}}`;
    const r = parseFactsText(raw);
    expect(r.ok).toBe(true);
    const t = tippsFuerFakten(raw, r);
    expect(t.nachfrage).toContain(`Lampen-Matrix: Verwende exakt diese Spalten`);
    expect(t.nachfrage).toContain(JSON.stringify(FACT_COLUMNS.lamps));
    expect(t.tipps[0]).toMatch(/Der Import geht so/);
  });

  it("hat bei sauberen Daten nichts nachzufragen", () => {
    const raw = `{${tabelle("coils", [spule])}, ${tabelle("fuses", [sicherung])}, ${tabelle("switches", [["11", "a", "b", "c", "d", "1", "1", "e"].slice(0, FACT_COLUMNS.switches.length)])}, ${tabelle("lamps", [["11"].concat(Array(FACT_COLUMNS.lamps.length - 1).fill("x"))])}}`;
    const r = parseFactsText(raw);
    expect(r.ok).toBe(true);
    const t = tippsFuerFakten(raw, r);
    // Matrix-Positionen können je nach Spaltenlage fehlen — dann gibt es genau
    // diese Nachfrage, sonst keine. Beides ist „nichts Falsches gemeldet".
    expect(t.tipps.every((x) => !/abgeschnitten|kein JSON|beschädigt/.test(x))).toBe(true);
  });
});

describe("tippsFuerGuide", () => {
  const guide = (abschnitte: number, quellen: number, plattform = "WPC-95") =>
    JSON.stringify({
      plattform,
      abschnitte: Array.from({ length: abschnitte }, (_, i) => ({
        titel: `Abschnitt ${i + 1}`,
        bloecke: [{ typ: "text", text: "Inhalt" }],
      })),
      quellen: Array.from({ length: quellen }, (_, i) => ({ titel: `Q${i}`, url: `https://q${i}.example` })),
    });

  it("erkennt Fließtext statt JSON", () => {
    const raw = "Der Guide: 1. Sicherheit … 2. Netzteil …";
    const t = tippsFuerGuide(raw, parseGuideText(raw));
    expect(t.tipps[0]).toMatch(/Fließtext/);
    expect(t.nachfrage).toMatch(/als JSON/);
  });

  it("erkennt den Abbruch — mit dem Hinweis auf kostenlose Konten", () => {
    const raw = guide(3, 1).slice(0, -20);
    const t = tippsFuerGuide(raw, parseGuideText(raw));
    expect(t.tipps[0]).toMatch(/kostenlose Konten/);
    expect(t.nachfrage).toMatch(/Abschnitte 1–4/);
  });

  it("erkennt den Abbruch auch ohne eine einzige geschlossene Klammer", () => {
    const raw = '{"plattform": "WPC", "abschnitte": [{"titel": "Sicherheit", "bloecke": [{"typ": "text", "text": "Netz';
    const t = tippsFuerGuide(raw, parseGuideText(raw));
    expect(t.tipps[0]).toMatch(/kostenlose Konten/);
  });

  it("nennt bei Strukturfehlern die Regel „exakt die Form“", () => {
    const raw = JSON.stringify({ plattform: "x", kapitel: [] });
    const t = tippsFuerGuide(raw, parseGuideText(raw));
    expect(t.tipps[0]).toMatch(/Struktur weicht ab/);
    expect(t.nachfrage).toMatch(/EXAKT/);
  });

  it("bittet bei wenig Abschnitten und ohne Quellen um Ergänzung und Websuche", () => {
    const raw = guide(3, 0);
    const r = parseGuideText(raw);
    expect(r.ok).toBe(true);
    const t = tippsFuerGuide(raw, r);
    expect(t.tipps.some((x) => /Websuche/.test(x))).toBe(true);
    expect(t.nachfrage).toMatch(/nur 3 Abschnitte/);
    expect(t.nachfrage).toMatch(/quellen war leer/);
  });

  it("hat bei einem vollständigen Guide nichts nachzufragen", () => {
    const raw = guide(7, 2);
    const t = tippsFuerGuide(raw, parseGuideText(raw));
    expect(t).toEqual({ tipps: [], nachfrage: null });
  });
});

describe("Node-Systeme (Stern SPIKE) — keine Matrix, keine falsche Nachfrage", () => {
  it("erkennt Node-Adressen und verlangt keine Rasterposition", () => {
    const raw = JSON.stringify({
      coils: { columns: FACT_COLUMNS.coils, rows: [spule] },
      fuses: { columns: FACT_COLUMNS.fuses, rows: [sicherung] },
      switches: {
        columns: FACT_COLUMNS.switches,
        rows: [
          ["8-SW-17", "", "", "mechanisch", "Left Flipper Button"],
          ["8-SW-18", "", "", "mechanisch", "Right Flipper Button"],
          ["9-SW-3", "", "", "opto", "Trough 1"],
        ],
      },
      lamps: {
        columns: FACT_COLUMNS.lamps,
        rows: [["8-LP-24", "", "", "Left Spinner"], ["288", "", "", "Backbox GI"]],
      },
    });
    const r = parseFactsText(raw);
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => /Matrix/.test(w))).toBe(false);
    expect(r.reports.find((x) => x.typ === "switches")).toMatchObject({ node: true, matrix: null });
    expect(r.reports.find((x) => x.typ === "lamps")).toMatchObject({ node: true, matrix: null });
    expect(tippsFuerFakten(raw, r)).toEqual({ tipps: [], nachfrage: null });
  });

  it("nagt bei einer echten Matrix ohne Positionen weiter — aber mit dem Vorbehalt", () => {
    const raw = JSON.stringify({
      coils: { columns: FACT_COLUMNS.coils, rows: [spule] },
      fuses: { columns: FACT_COLUMNS.fuses, rows: [sicherung] },
      switches: {
        columns: FACT_COLUMNS.switches,
        rows: [["11", "", "", "mechanisch", "A"], ["12", "", "", "mechanisch", "B"]],
      },
      lamps: { columns: FACT_COLUMNS.lamps, rows: [["11", "", "", "L"]] },
    });
    const r = parseFactsText(raw);
    const t = tippsFuerFakten(raw, r);
    expect(t.nachfrage).toMatch(/bei Node-Systemen .* bleiben sie leer/);
  });
});
