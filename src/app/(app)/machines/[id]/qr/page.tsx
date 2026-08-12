import QRCode from "qrcode";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { QrDownload } from "@/components/qr-download";
import { QrPrint } from "@/components/qr-print";
import { db } from "@/db";
import { clubs } from "@/db/schema";
import { requireMachineAccess } from "@/lib/session";
import { modellName } from "@/lib/format";

/*
  QR-Etikett einer Maschine: der Code führt auf die öffentliche Melde-Seite
  /m/<qr_token> — wer vor dem Gerät steht, kann so ohne Konto einen Fehler
  melden (Gast mit Name) bzw. landet angemeldet direkt im Fehler-Reiter.

  Der QR wird serverseitig erzeugt (keine externen Dienste — die CSP erlaubt
  ohnehin keine fremden Bildquellen) und steht in Druckqualität zum Download
  bereit: PNG mit 2048 px für Bildprogramme, SVG als Vektor (beliebig
  skalierbar, ideal für Druckereien). Beim Drucken blendet `print:hidden`
  alles außer dem Etikett aus (App-Header siehe Layout).
*/
function baseUrl() {
  return (
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3100"
  );
}

/** Dateiname-tauglicher Maschinenname (qr-godzilla-premium.png). */
function dateiname(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/*
  Das Club-Logo als Data-URL zum Client geben: die Download-Komposition läuft
  im Browser (Canvas/SVG), und eine Data-URL umgeht CORS-/Taint-Fragen des
  Storage komplett. Größenwache, damit keine Riesendatei in die Seite wandert.
*/
async function logoAlsDataUrl(url: string | null): Promise<string | null> {
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

export default async function MachineQrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { machine } = await requireMachineAccess(id);

  // Bewusst knapp (/m/<12 Zeichen>): je kürzer die URL, desto gröber und
  // robuster der QR-Code.
  const meldeUrl = `${baseUrl()}/m/${machine.qrToken}`;
  const svg = await QRCode.toString(meldeUrl, {
    type: "svg",
    margin: 1,
    width: 480,
    errorCorrectionLevel: "M",
  });
  // Hochauflösendes PNG (2048 px) — Grundlage für den Download.
  const pngDataUrl = await QRCode.toDataURL(meldeUrl, {
    margin: 1,
    width: 2048,
    errorCorrectionLevel: "M",
  });
  const basisname = `qr-${dateiname(modellName(machine))}`;

  // Club-Logo (falls Club-Maschine mit Logo) für die Download-Varianten
  // „Logo links/rechts" — siehe QrDownload.
  const club = machine.clubId
    ? await db.query.clubs.findFirst({
        where: eq(clubs.id, machine.clubId),
        columns: { logoUrl: true },
      })
    : null;
  const logoDataUrl = await logoAlsDataUrl(club?.logoUrl ?? null);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/machines/${machine.id}`}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          <ArrowLeft size={14} /> {modellName(machine)}
        </Link>
        <QrDownload
          qrSvg={svg}
          qrPngDataUrl={pngDataUrl}
          logoDataUrl={logoDataUrl}
          basisname={basisname}
        />
      </div>

      {/* Drucken: Etiketten (frei) oder Scorecards (Herstellermaße). */}
      <section className="space-y-3 print:space-y-0">
        <h1 className="text-xl font-bold print:hidden">QR-Code drucken</h1>
        <QrPrint
          qrSvg={svg}
          name={modellName(machine)}
          logoDataUrl={logoDataUrl}
          hersteller={machine.hersteller}
        />
      </section>

      <p className="text-center text-xs text-[var(--color-muted)] print:hidden">
        Der Code führt zu <span className="font-mono">{meldeUrl}</span>
      </p>
    </div>
  );
}
