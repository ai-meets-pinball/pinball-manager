import {
  extractTextItems,
  getDocumentProxy,
  renderPageAsImage,
  type StructuredTextItem,
} from "unpdf";

/*
  PDF-Vorverarbeitung für den lokalen Ollama-Pfad.

  Claude bekommt das PDF direkt als Dokument-Block; Ollama/Gemma kann das nicht —
  wir müssen vorverarbeiten. Da die Handbücher gemischt sind (digital vs.
  gescannt), wählt diese Funktion automatisch:
    - Text-Pfad: Text mit erhaltener Tabellen-Geometrie (aus den Item-Koordinaten
      rekonstruiert) — der größte Hebel für Tabellen-Treue bei kleinen Modellen.
    - Vision-Pfad: Seiten als PNG (base64) für ein multimodales Modell.

  Copyright-Pipeline: alles bleibt im Speicher (Uint8Array/ArrayBuffer), es wird
  KEINE Datei geschrieben — weder das PDF noch die gerenderten Seiten.
*/

export type LocalPdfInput =
  | { mode: "text"; text: string }
  | {
      mode: "vision";
      totalPages: number;
      // Seiten [from, from+count) lazy rendern (base64-PNGs). So liegen nie alle
      // Seiten eines Großhandbuchs gleichzeitig im Speicher — die Extraktion holt
      // sie batchweise (siehe manual-extract.ts).
      renderRange: (from: number, count: number) => Promise<string[]>;
    };

// Obergrenze für den Vision-Pfad: sehr große gescannte Manuals sind (auch
// batchweise) irgendwann unpraktikabel langsam. Handbücher bis ~300 Seiten sollen
// gehen; darüber lieber ein klarer Fehler als eine stundenlange Hängepartie.
const MAX_VISION_PAGES = Number(process.env.LOCAL_VISION_MAX_PAGES) || 400;
// Render-Auflösung als fixer Scale-Faktor (≈2 → ~144 dpi). Genug für Tabellen-
// schrift, ohne das 896²-Encoder-Limit der Vision-Modelle mit Detail zu überfüttern.
const RENDER_SCALE = Number(process.env.LOCAL_RENDER_SCALE) || 2;

// Schwellen für „gescannt": (fast) kein extrahierbarer Textlayer. Zwei Kriterien
// (Gesamt + je Seite), damit ein Deckblatt-OCR-Wort keine Fehlklassifikation macht.
const TEXT_MIN_TOTAL = 200;
const TEXT_MIN_PER_PAGE = 50;

/*
  Eine Seite aus ihren Text-Items zu zeilen-/spaltentreuem Text rekonstruieren.
  y ist die PDF-Koordinate (Ursprung unten links) → absteigend = von oben nach
  unten. Items mit fast gleichem y bilden eine Zeile; große x-Lücken werden zu
  Tabs (Spaltengrenzen), damit Tabellen als Raster erhalten bleiben.
*/
function reconstructPage(items: StructuredTextItem[]): string {
  if (items.length === 0) return "";
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  const rows: StructuredTextItem[][] = [];
  const Y_TOLERANZ = 3; // Punkte
  for (const it of sorted) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row[0].y - it.y) <= Y_TOLERANZ) row.push(it);
    else rows.push([it]);
  }

  return rows
    .map((row) => {
      row.sort((a, b) => a.x - b.x);
      let line = "";
      let prevEnd = 0;
      for (const it of row) {
        if (line) {
          const luecke = it.x - prevEnd;
          line += luecke > 12 ? "\t" : luecke > 1 ? " " : "";
        }
        line += it.str;
        prevEnd = it.x + it.width;
      }
      return line.trimEnd();
    })
    .filter((l) => l.trim().length > 0)
    .join("\n");
}

export async function preparePdfForLocalModel(
  buffer: Buffer,
): Promise<LocalPdfInput> {
  const bytes = new Uint8Array(buffer); // nur im Speicher, keine Datei
  const doc = await getDocumentProxy(bytes);

  // Text-Items je Seite ziehen (mit Koordinaten) und Textmenge messen.
  const { totalPages, items } = await extractTextItems(doc);
  const chars = items.reduce(
    (n, page) =>
      n + page.reduce((m, it) => m + it.str.replace(/\s/g, "").length, 0),
    0,
  );
  const gescannt =
    chars < TEXT_MIN_TOTAL || chars / Math.max(totalPages, 1) < TEXT_MIN_PER_PAGE;

  if (!gescannt) {
    const seiten = items.map(
      (pageItems, i) => `--- Seite ${i + 1} ---\n${reconstructPage(pageItems)}`,
    );
    return { mode: "text", text: seiten.join("\n\n") };
  }

  // Vision-Pfad (gescanntes PDF). Nicht alle Seiten auf einmal rendern, sondern
  // eine Render-Funktion zurückgeben, die die Extraktion batchweise aufruft.
  if (totalPages > MAX_VISION_PAGES) {
    throw new Error(
      `Das gescannte Handbuch hat ${totalPages} Seiten — für die lokale Verarbeitung sind maximal ${MAX_VISION_PAGES} möglich (LOCAL_VISION_MAX_PAGES erhöhen).`,
    );
  }

  const renderRange = async (from: number, count: number): Promise<string[]> => {
    const images: string[] = [];
    for (let p = from; p < from + count && p <= totalPages; p++) {
      // WICHTIG: je Seite eine FRISCHE Byte-Kopie an renderPageAsImage geben.
      // pdfjs „transferiert" den Buffer beim Rendern (ArrayBuffer.transferToFixed-
      // Length — in Node 20 nicht vorhanden) und lässt einen wiederverwendeten doc
      // unbrauchbar zurück: nur die 1. Seite würde rendern, ab der 2. bricht/hängt
      // es. Mit einer eigenen Kopie je Render ist jede Seite unabhängig (~30 ms).
      const png = await renderPageAsImage(new Uint8Array(buffer), p, {
        scale: RENDER_SCALE,
        canvasImport: () => import("@napi-rs/canvas"),
      });
      images.push(Buffer.from(png).toString("base64")); // keine Datei
    }
    return images;
  };

  return { mode: "vision", totalPages, renderRange };
}

/** Seitenzahl eines PDFs (in-memory). */
export async function pdfPageCount(buffer: Buffer): Promise<number> {
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  return doc.numPages;
}

/*
  Seiten [from, from+count) in HOHER Auflösung als base64-PNGs rendern — für den
  „Hohe Detailstufe"-Modus der Claude-Extraktion: schwer lesbare Scans, bei denen
  Claudes interne PDF-Darstellung zu grob ist. `longEdge` = Ziel-px der langen
  Kante (Sonnet nutzt Bilder bis 2576 px). Wie bei renderRange: frische Byte-Kopie
  je Render (Node-20-Detach). Skalierung aus der 1. Seite (uniforme Größe genügt).
*/
export async function renderPdfPagesToPng(
  buffer: Buffer,
  from: number,
  count: number,
  longEdge: number,
): Promise<string[]> {
  const probe = await getDocumentProxy(new Uint8Array(buffer));
  const total = probe.numPages;
  const vp = (await probe.getPage(1)).getViewport({ scale: 1 });
  const scale = Math.min(6, longEdge / Math.max(vp.width, vp.height));

  const images: string[] = [];
  for (let p = from; p < from + count && p <= total; p++) {
    const png = await renderPageAsImage(new Uint8Array(buffer), p, {
      scale,
      canvasImport: () => import("@napi-rs/canvas"),
    });
    images.push(Buffer.from(png).toString("base64"));
  }
  return images;
}
