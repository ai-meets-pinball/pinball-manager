import { AiError, type AiDokument } from "@/lib/ai/types";
import { claudePdfMaxPages, type AiProvider } from "@/lib/ai/provider";
import { mlxOcr, mlxOcrConfigured } from "@/lib/ai/mlx";
import {
  pdfPageCount,
  preparePdfForLocalModel,
  renderPdfPagesToPng,
} from "@/lib/ai/prepare-pdf";
import { splitPdfForClaude } from "@/lib/ai/split-pdf";

/*
  Ein PDF in das übersetzen, was der gewählte Anbieter lesen kann.

  Das ist die zweite Hälfte des Anbieter-Seams. Ohne sie müsste der Aufrufer
  weiterhin wissen, dass Claude PDFs nativ liest (in Pakete geschnitten),
  Ollama Text oder Seitenbilder braucht und MLX gescannte Seiten erst durch
  einen OCR-Server schicken muss. Danach verzweigt der Aufrufer nicht mehr
  über den Anbieter — er läuft nur noch über Pakete.

  Copyright-Pipeline (PRD §6): alles bleibt im Speicher. Es wird kein PDF,
  kein Seitenbild und kein OCR-Text auf die Platte geschrieben.

  Pakete laden ihren Inhalt LAZY. Ein 400-Seiten-Scan als PNG wäre sonst
  gigabyteweise Speicher, obwohl immer nur ein Paket gleichzeitig gebraucht wird.
*/

// Ollama/MLX: wenige Seiten je Aufruf — kleine Modelle verarbeiten das
// zuverlässiger und schneller.
const VISION_BATCH = Number(process.env.LOCAL_VISION_BATCH_SIZE) || 6;

// Claude mit hoher Detailstufe: wenige Seiten je Request (die hochauflösenden
// Bilder sind groß), lange Kante ~2200 px (Sonnet nutzt bis 2576 px).
const HIRES_BATCH = 10;
const HIRES_LONG_EDGE = 2200;

export type Paketinhalt = { dokument?: AiDokument; text?: string };

export type Paket = {
  nummer: number;
  vonSeite: number;
  bisSeite: number;
  /** Inhalt erst beim Zugriff erzeugen (Rendern bzw. OCR). */
  laden: () => Promise<Paketinhalt>;
};

export type Aufbereitung = {
  modus: "text" | "vision";
  /** 0 = unbekannt/irrelevant (reiner Textpfad). */
  seiten: number;
  /**
   * true: die Pakete liefern TEXT, der zu EINEM Struktur-Aufruf zusammengefügt
   * wird (MLX-Scan: erst OCR, dann ein Long-Context-Call).
   * false: jedes Paket wird einzeln ausgewertet, die Ergebnisse danach vereint.
   */
  zuTextVereinen: boolean;
  pakete: Paket[];
};

/** Ein PDF für den gewählten Anbieter aufbereiten. */
export async function prepareDocument(opts: {
  provider: AiProvider;
  buffer: Buffer;
  /** Hohe Detailstufe: Seiten selbst hochauflösend rendern (nur Claude). */
  highDetail?: boolean;
}): Promise<Aufbereitung> {
  const { provider, buffer, highDetail } = opts;

  if (provider === "ollama" || provider === "mlx") {
    return lokal(provider, buffer);
  }
  return highDetail ? claudeBilder(buffer) : claudePdf(provider, buffer);
}

/* ── Claude: PDF nativ, in Pakete geschnitten ─────────────────────────────── */

async function claudePdf(
  provider: AiProvider,
  buffer: Buffer,
): Promise<Aufbereitung> {
  let split: Awaited<ReturnType<typeof splitPdfForClaude>>;
  try {
    split = await splitPdfForClaude(buffer, claudePdfMaxPages(provider));
  } catch (e) {
    throw new AiError(
      "sonstiges",
      "Das PDF konnte nicht gelesen/aufgeteilt werden. Ist es ein gültiges PDF?",
      e,
    );
  }
  return {
    modus: "text",
    seiten: split.totalPages,
    zuTextVereinen: false,
    pakete: split.chunks.map((c, i) => ({
      nummer: i + 1,
      vonSeite: c.fromPage,
      bisSeite: c.toPage,
      laden: async () => ({ dokument: { art: "pdf", base64: c.base64 } }),
    })),
  };
}

/* ── Claude: Seiten selbst hochauflösend rendern (schwer lesbare Scans) ───── */

async function claudeBilder(buffer: Buffer): Promise<Aufbereitung> {
  let seiten: number;
  try {
    seiten = await pdfPageCount(buffer);
  } catch (e) {
    throw new AiError(
      "sonstiges",
      "Das PDF konnte nicht gelesen werden. Ist es ein gültiges PDF?",
      e,
    );
  }
  return {
    modus: "vision",
    seiten,
    zuTextVereinen: false,
    pakete: bereiche(seiten, HIRES_BATCH).map((b, i) => ({
      nummer: i + 1,
      vonSeite: b.von,
      bisSeite: b.bis,
      laden: async () => {
        try {
          const bilder = await renderPdfPagesToPng(
            buffer,
            b.von,
            HIRES_BATCH,
            HIRES_LONG_EDGE,
          );
          return { dokument: { art: "bilder", bilder } };
        } catch (e) {
          throw new AiError(
            "sonstiges",
            "Die Seiten konnten nicht gerendert werden.",
            e,
          );
        }
      },
    })),
  };
}

/* ── Lokal: Ollama (Text oder Bilder) und MLX (Text, Scans via OCR) ───────── */

async function lokal(
  provider: "ollama" | "mlx",
  buffer: Buffer,
): Promise<Aufbereitung> {
  let vorbereitet: Awaited<ReturnType<typeof preparePdfForLocalModel>>;
  try {
    vorbereitet = await preparePdfForLocalModel(buffer);
  } catch (e) {
    throw new AiError(
      "sonstiges",
      (e as Error).message || "Das PDF konnte nicht vorbereitet werden.",
      e,
    );
  }

  // Digitales PDF: der Text steht schon da, ein einziger Aufruf reicht.
  if (vorbereitet.mode === "text") {
    const text = vorbereitet.text;
    return {
      modus: "text",
      seiten: 0,
      zuTextVereinen: false,
      pakete: [
        { nummer: 1, vonSeite: 1, bisSeite: 1, laden: async () => ({ text }) },
      ],
    };
  }

  const { totalPages, renderRange } = vorbereitet;

  // Gescannt + MLX: Seiten erst durch den OCR-Server, der erkannte Text geht
  // danach als EIN Long-Context-Call in die Struktur-Extraktion.
  if (provider === "mlx") {
    if (!mlxOcrConfigured()) {
      throw new AiError(
        "sonstiges",
        "Gescanntes Handbuch: für MLX ist kein OCR-Server konfiguriert (MLX_OCR_URL). Bitte Ollama/Claude nutzen oder den OCR-Server starten (docs/MLX_SETUP.md).",
      );
    }
    return {
      modus: "vision",
      seiten: totalPages,
      zuTextVereinen: true,
      pakete: bereiche(totalPages, VISION_BATCH).map((b, i) => ({
        nummer: i + 1,
        vonSeite: b.von,
        bisSeite: b.bis,
        laden: async () => ({
          text: await mlxOcr(await renderRange(b.von, VISION_BATCH)),
        }),
      })),
    };
  }

  // Gescannt + Ollama: Seitenbilder direkt ans multimodale Modell, jede
  // Gruppe für sich — die Teilergebnisse werden danach zusammengeführt.
  return {
    modus: "vision",
    seiten: totalPages,
    zuTextVereinen: false,
    pakete: bereiche(totalPages, VISION_BATCH).map((b, i) => ({
      nummer: i + 1,
      vonSeite: b.von,
      bisSeite: b.bis,
      laden: async () => ({
        dokument: { art: "bilder", bilder: await renderRange(b.von, VISION_BATCH) },
      }),
    })),
  };
}

/** Seitenzahl in Bereiche der Größe `groesse` zerlegen (1-basiert, inklusiv). */
export function bereiche(
  seiten: number,
  groesse: number,
): { von: number; bis: number }[] {
  const out: { von: number; bis: number }[] = [];
  for (let von = 1; von <= seiten; von += groesse) {
    out.push({ von, bis: Math.min(von + groesse - 1, seiten) });
  }
  return out;
}
