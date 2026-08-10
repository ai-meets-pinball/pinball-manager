import { PDFDocument } from "pdf-lib";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiError } from "@/lib/ai/types";
import { FACT_COLUMNS } from "@/lib/validators";

/*
  Die Extraktionskette als Ganzes — mit einem ECHTEN PDF, aber ohne Modell.

  Bisher war der Weg vom Upload bis zum gespeicherten Wissen nur mit einem
  laufenden Claude/Ollama/MLX prüfbar; genau deshalb waren Abbruch, Abschneiden
  und die Auto-Eskalation nie getestet. Hier läuft alles Echte mit —
  Datei-Prüfungen, prepareDocument samt pdf-lib, das Fortschritts-Protokoll,
  das Zusammenführen der Pakete — nur der Modellaufruf am Seam ist gefälscht
  und der Schreibzugriff abgefangen.

  Mit geprüft wird die Copyright-Leitplanke (PRD §6): das Modell bekommt das
  PDF ausschließlich als In-Memory-base64 zu sehen, und gespeichert werden nur
  die extrahierten Fakten.
*/

const generateJson = vi.hoisted(() => vi.fn());
const upsertModelKnowledge = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/generate", async () => ({
  ...(await vi.importActual<object>("@/lib/ai/generate")),
  generateJson,
}));
vi.mock("@/lib/facts-store", () => ({ upsertModelKnowledge }));

const { extractManualFactsStream } = await import("@/lib/manual-extract");

/** Ein echtes, minimales PDF — pdf-lib ist Projekt-Abhängigkeit. */
async function pdfDatei(seiten = 1, name = "handbuch.pdf"): Promise<File> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < seiten; i++) doc.addPage([600, 800]);
  const bytes = await doc.save();
  // Kopie in einen eigenen ArrayBuffer: pdf-lib gibt ein Uint8Array über einem
  // ArrayBufferLike zurück, File verlangt einen echten ArrayBuffer.
  const puffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(puffer).set(bytes);
  return new File([puffer], name, { type: "application/pdf" });
}

const leer = { columns: [] as string[], rows: [] as string[][] };
const mitSpulen = (rows: string[][]) => ({
  coils: { columns: FACT_COLUMNS.coils, rows },
  switches: leer,
  lamps: leer,
  fuses: leer,
  parts: leer,
  rules: leer,
});

const antwort = (json: unknown, extra: Record<string, unknown> = {}) => ({
  json,
  model: "test-modell",
  websucheGenutzt: false,
  abgeschnitten: false,
  ...extra,
});

const zeile = (n: string) => [n, `Funktion ${n}`, "", "", "", ""];

async function lauf(opts: Partial<Parameters<typeof extractManualFactsStream>[0]> = {}) {
  const events = [];
  const stream = extractManualFactsStream({
    userId: "u1",
    machine: { id: "m1", modelId: "mo1", hersteller: "Williams", modell: "Monster Bash" },
    visibility: "privat",
    file: await pdfDatei(),
    attest: true,
    provider: "anthropic",
    ...opts,
  });
  for await (const e of stream) events.push(e);
  return events;
}

const typen = (events: { type: string }[]) => events.map((e) => e.type);
const fehler = (events: { type: string; error?: string }[]) =>
  events.find((e) => e.type === "error")?.error;

beforeEach(() => {
  generateJson.mockReset();
  upsertModelKnowledge.mockReset();
});

describe("Eingangsprüfungen", () => {
  it("verlangt die Rechtebestätigung, bevor irgendetwas passiert", async () => {
    const events = await lauf({ attest: false });
    expect(fehler(events)).toMatch(/besitzt bzw. die Rechte/);
    expect(generateJson).not.toHaveBeenCalled();
  });

  it("nimmt nur PDFs", async () => {
    const txt = new File(["kein pdf"], "notiz.txt", { type: "text/plain" });
    expect(fehler(await lauf({ file: txt }))).toMatch(/Nur PDF-Dateien/);
    expect(generateJson).not.toHaveBeenCalled();
  });

  it("lehnt eine leere Datei ab", async () => {
    const leerDatei = new File([], "leer.pdf", { type: "application/pdf" });
    expect(fehler(await lauf({ file: leerDatei }))).toMatch(/Handbuch als PDF/);
  });
});

describe("Erfolgsfall", () => {
  it("meldet Fortschritt, speichert die Fakten und zählt sie", async () => {
    generateJson.mockResolvedValue(antwort(mitSpulen([zeile("1"), zeile("2")])));

    const events = await lauf();

    expect(typen(events)).toContain("start");
    expect(typen(events)).toContain("done");
    expect(typen(events)).not.toContain("error");
    const done = events.at(-1) as { type: "done"; counts: Record<string, number> };
    expect(done.counts).toEqual({ coils: 2 });

    expect(upsertModelKnowledge).toHaveBeenCalledTimes(1);
    const gespeichert = upsertModelKnowledge.mock.calls[0][0];
    expect(gespeichert.userId).toBe("u1");
    expect(gespeichert.result.coils.rows).toHaveLength(2);
  });

  it("gibt dem Modell das PDF nur als base64 im Speicher — nichts wird abgelegt", async () => {
    generateJson.mockResolvedValue(antwort(mitSpulen([zeile("1")])));
    await lauf();

    const anfrage = generateJson.mock.calls[0][1];
    expect(anfrage.dokument.art).toBe("pdf");
    expect(typeof anfrage.dokument.base64).toBe("string");
    // Ein echtes PDF beginnt mit %PDF → base64 „JVBER…".
    expect(anfrage.dokument.base64.startsWith("JVBER")).toBe(true);
    expect(JSON.stringify(anfrage)).not.toMatch(/\/tmp|\.pdf$/);
  });

  it("schreibt nichts, wenn das Modell keine Tabelle findet", async () => {
    generateJson.mockResolvedValue(antwort(mitSpulen([])));

    const events = await lauf();

    // Ein leerer Lauf darf vorhandene Fakten nicht löschen.
    expect(upsertModelKnowledge).not.toHaveBeenCalled();
    const done = events.at(-1) as { type: "done"; counts: Record<string, number> };
    expect(done.counts).toEqual({});
  });
});

describe("Fehlerzustände am Seam", () => {
  it("bricht bei einem Verbindungsproblem ab", async () => {
    generateJson.mockRejectedValue(
      new AiError("nicht-erreichbar", "Claude ist gerade überlastet."),
    );

    const events = await lauf();

    expect(fehler(events)).toBe("Claude ist gerade überlastet.");
    expect(upsertModelKnowledge).not.toHaveBeenCalled();
  });

  it("bricht bei einer Ablehnung ab", async () => {
    generateJson.mockRejectedValue(
      new AiError("abgelehnt", "Die Verarbeitung wurde abgelehnt."),
    );
    expect(fehler(await lauf())).toMatch(/abgelehnt/);
  });

  it("überspringt ein unbrauchbares Paket, statt alles zu verlieren", async () => {
    generateJson.mockRejectedValue(
      new AiError("ungueltige-antwort", "Antwort konnte nicht ausgewertet werden."),
    );

    const events = await lauf();

    // Kein harter Abbruch: der Lauf endet regulär, nur ohne Ergebnis.
    expect(typen(events)).toContain("done");
    expect(typen(events)).not.toContain("error");
  });

  it("überspringt ein abgeschnittenes Paket", async () => {
    generateJson.mockResolvedValue(
      antwort(null, { abgeschnitten: true }),
    );

    const events = await lauf();

    expect(typen(events)).toContain("done");
    expect(upsertModelKnowledge).not.toHaveBeenCalled();
  });
});

describe("Auto-Eskalation", () => {
  it("schaltet auf das starke Modell, wenn das günstige nichts fand", async () => {
    generateJson
      .mockResolvedValueOnce(antwort(mitSpulen([]))) // Haiku: leer
      .mockResolvedValueOnce(antwort(mitSpulen([zeile("1")]))); // Sonnet: Treffer

    const events = await lauf({ provider: "auto" });

    expect(generateJson).toHaveBeenCalledTimes(2);
    const hinweise = events
      .filter((e): e is { type: "info"; message: string } => e.type === "info")
      .map((e) => e.message);
    expect(hinweise.join(" ")).toMatch(/schalte auf/);
    // Der zweite Durchgang läuft mit einem erzwungenen Modell.
    expect(generateJson.mock.calls[1][1].model).toBeTruthy();
    expect(upsertModelKnowledge).toHaveBeenCalledTimes(1);
  });

  it("eskaliert NICHT, wenn schon der erste Durchgang etwas fand", async () => {
    generateJson.mockResolvedValue(antwort(mitSpulen([zeile("1")])));
    await lauf({ provider: "auto" });
    expect(generateJson).toHaveBeenCalledTimes(1);
  });

  it("eskaliert nicht bei einem lokalen Anbieter", async () => {
    generateJson.mockResolvedValue(antwort(mitSpulen([])));
    await lauf({ provider: "ollama" });
    expect(generateJson).toHaveBeenCalledTimes(1);
  });
});

describe("Normalisierung im KI-Pfad", () => {
  it("füllt zu kurze Zeilen auf und sagt es im Fortschritt", async () => {
    // Genau der Fall, an dem die KI-Antwort vor der Vereinheitlichung
    // hart scheiterte, während eine Einfügung geheilt worden wäre.
    generateJson.mockResolvedValue(
      antwort({ ...mitSpulen([]), coils: { columns: FACT_COLUMNS.coils, rows: [["1", "Flipper"]] } }),
    );

    const events = await lauf();

    const hinweise = events
      .filter((e): e is { type: "info"; message: string } => e.type === "info")
      .map((e) => e.message)
      .join(" ");
    expect(hinweise).toMatch(/aufgefüllt/);
    const gespeichert = upsertModelKnowledge.mock.calls[0][0];
    expect(gespeichert.result.coils.rows[0]).toHaveLength(FACT_COLUMNS.coils.length);
  });
});
