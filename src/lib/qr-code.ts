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

/** Melde-SVG für einen QR-Token (führt auf /m/<token>). */
export async function erzeugeQrSvg(token: string): Promise<string> {
  return QRCode.toString(`${baseUrl()}/m/${token}`, {
    type: "svg",
    margin: 1,
    width: 480,
    errorCorrectionLevel: "M",
  });
}
