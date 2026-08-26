import QRCode from "qrcode";

/*
  Gemeinsame QR-Helfer (serverseitig): die Melde-URL zeigt auf die öffentliche
  Route /m/<qr_token>. Der QR wird als Vektor-SVG erzeugt — keine externen
  Dienste (die CSP lässt ohnehin keine fremden Bildquellen zu), beliebig scharf
  skalierbar. Genutzt von der QR-Seite und der „weitere Karten"-Action.
*/
export function baseUrl(): string {
  return (
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3100"
  );
}

/** QR-SVG für eine beliebige URL (Vektor, keine externen Dienste) — z. B. für
    Beispiel-Etiketten auf der öffentlichen Log-Seite. */
export async function erzeugeQrSvgFuerUrl(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    width: 480,
    errorCorrectionLevel: "M",
  });
}

/** Melde-SVG für einen QR-Token (führt auf /m/<token>). */
export async function erzeugeQrSvg(token: string): Promise<string> {
  return erzeugeQrSvgFuerUrl(`${baseUrl()}/m/${token}`);
}

/*
  Ein (Logo-)Bild von einer URL als Data-URL — für die CLIENT-seitige QR-
  Komposition (Canvas/SVG in QrDownload), die so CORS-/Taint-Fragen des Storage
  komplett umgeht. Größenwache, damit keine Riesendatei in die Seite wandert.
  Server-only (Buffer/fetch). Geteilt von allen QR-Seiten (Maschine, Club, privat).
*/
export async function logoAlsDataUrl(
  url: string | null,
): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength > 5 * 1024 * 1024) return null;
    const typ = res.headers.get("content-type") ?? "image/png";
    return `data:${typ};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Dateiname-tauglicher Slug für Download-Basisnamen (qr-godzilla-premium). */
export function dateiname(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
