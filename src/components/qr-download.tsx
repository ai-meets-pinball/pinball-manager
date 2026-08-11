"use client";

import { useState } from "react";
import { Download } from "lucide-react";

/*
  QR-Download mit optionalem Club-Logo: „ohne", „Logo links" oder „Logo
  rechts" neben dem Code — gewählt wird per Pillen, komponiert wird im
  Client (Canvas für PNG, SVG-Wrapper für Vektor). Das Logo kommt als
  Data-URL vom Server (kein CORS, kein getaintetes Canvas).

  PNG: 2048 px QR (+ 2048 px Logo-Feld) — Druckqualität.
  SVG: Vektor-Wrapper; Logo und QR als eingebettete <image>-Data-URLs.
*/
type Variante = "ohne" | "links" | "rechts";

export function QrDownload({
  qrSvg,
  qrPngDataUrl,
  logoDataUrl,
  basisname,
}: {
  qrSvg: string;
  qrPngDataUrl: string;
  logoDataUrl: string | null;
  basisname: string;
}) {
  const [variante, setVariante] = useState<Variante>("ohne");
  const mitLogo = variante !== "ohne" && logoDataUrl;

  function herunterladen(href: string, dateiname: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = dateiname;
    a.click();
  }

  function svgHerunterladen() {
    if (!mitLogo) {
      herunterladen(
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`,
        `${basisname}.svg`,
      );
      return;
    }
    // Wrapper: zwei Quadrate (1024) nebeneinander mit Lücke, weißer Grund.
    const S = 1024;
    const G = 64;
    const qrHref = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`;
    const [erst, zweit] =
      variante === "links" ? [logoDataUrl, qrHref] : [qrHref, logoDataUrl];
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${2 * S + G} ${S}">` +
      `<rect width="${2 * S + G}" height="${S}" fill="#ffffff"/>` +
      `<image x="0" y="0" width="${S}" height="${S}" href="${erst}" preserveAspectRatio="xMidYMid meet"/>` +
      `<image x="${S + G}" y="0" width="${S}" height="${S}" href="${zweit}" preserveAspectRatio="xMidYMid meet"/>` +
      `</svg>`;
    herunterladen(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      `${basisname}.svg`,
    );
  }

  async function pngHerunterladen() {
    if (!mitLogo) {
      herunterladen(qrPngDataUrl, `${basisname}.png`);
      return;
    }
    const S = 2048;
    const G = 128;
    const laden = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () =>
          reject(new Error("Bild konnte nicht geladen werden"));
        img.src = src;
      });
    const [qrBild, logoBild] = await Promise.all([
      laden(qrPngDataUrl),
      laden(logoDataUrl),
    ]);

    const canvas = document.createElement("canvas");
    canvas.width = 2 * S + G;
    canvas.height = S;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Logo proportional in sein Quadrat einpassen (contain, mittig).
    const skala = Math.min(S / logoBild.width, S / logoBild.height);
    const lw = logoBild.width * skala;
    const lh = logoBild.height * skala;
    const logoX0 = variante === "links" ? 0 : S + G;
    const qrX0 = variante === "links" ? S + G : 0;
    ctx.drawImage(logoBild, logoX0 + (S - lw) / 2, (S - lh) / 2, lw, lh);
    ctx.drawImage(qrBild, qrX0, 0, S, S);

    herunterladen(canvas.toDataURL("image/png"), `${basisname}.png`);
  }

  const knopfKlasse =
    "inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-border)]/40";
  const pillKlasse = (aktiv: boolean) =>
    `rounded-full border px-3 py-1 text-sm transition-colors ${
      aktiv
        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
        : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {logoDataUrl ? (
        <div
          className="flex items-center gap-1.5"
          role="group"
          aria-label="Club-Logo im Bild"
        >
          {(
            [
              ["ohne", "Ohne Logo"],
              ["links", "Logo links"],
              ["rechts", "Logo rechts"],
            ] as const
          ).map(([wert, label]) => (
            <button
              key={wert}
              type="button"
              onClick={() => setVariante(wert)}
              aria-pressed={variante === wert}
              className={pillKlasse(variante === wert)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => void pngHerunterladen()}
        className={knopfKlasse}
      >
        <Download size={15} /> PNG
      </button>
      <button type="button" onClick={svgHerunterladen} className={knopfKlasse}>
        <Download size={15} /> SVG
      </button>
    </div>
  );
}
