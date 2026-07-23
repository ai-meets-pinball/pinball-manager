import { PDFDocument } from "pdf-lib";

/*
  Claude liest PDFs nativ, aber je Request nur begrenzt: max. 100 Seiten
  (200k-Kontext, Haiku) bzw. 600 (Sonnet), und 32 MB Request-Größe. Große
  Handbücher teilen wir daher in Pakete — jedes ≤ maxPages Seiten UND ≤ ~22 MB
  roh (base64 bläht ~1,37× → unter 32 MB). Ergebnisse werden danach zusammengeführt.

  Alles im Speicher (pdf-lib, rein JS): Copyright-Pipeline bleibt intakt, es wird
  kein PDF auf die Platte geschrieben.
*/

export type PdfChunk = { base64: string; fromPage: number; toPage: number };

// Roh-Grenze je Paket; base64 daraus ~30 MB (< 32-MB-Request-Limit + Prompt).
const MAX_CHUNK_BYTES = 22 * 1024 * 1024;

export async function splitPdfForClaude(
  buffer: Buffer,
  maxPages: number,
): Promise<{ totalPages: number; chunks: PdfChunk[] }> {
  const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const total = src.getPageCount();

  // Kleines Handbuch (≤ maxPages UND ≤ Größenlimit): unverändert als ein Paket.
  if (total <= maxPages && buffer.length <= MAX_CHUNK_BYTES) {
    return {
      totalPages: total,
      chunks: [{ base64: buffer.toString("base64"), fromPage: 1, toPage: total }],
    };
  }

  const chunks: PdfChunk[] = [];
  let start = 0; // 0-basiert
  while (start < total) {
    let end = Math.min(start + maxPages, total); // exklusiv
    let bytes = await buildChunk(src, start, end);
    // Zu groß (gescannte Seiten sind schwer)? Seitenzahl halbieren, bis es passt.
    while (bytes.length > MAX_CHUNK_BYTES && end - start > 1) {
      end = start + Math.max(1, Math.floor((end - start) / 2));
      bytes = await buildChunk(src, start, end);
    }
    chunks.push({
      base64: bytes.toString("base64"),
      fromPage: start + 1,
      toPage: end,
    });
    start = end;
  }
  return { totalPages: total, chunks };
}

async function buildChunk(
  src: PDFDocument,
  start: number,
  end: number,
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const indices = Array.from({ length: end - start }, (_, i) => start + i);
  const pages = await doc.copyPages(src, indices);
  for (const p of pages) doc.addPage(p);
  return Buffer.from(await doc.save());
}
