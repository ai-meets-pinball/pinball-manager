import QRCode from "qrcode";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { QrDownload } from "@/components/qr-download";
import { db } from "@/db";
import { clubs } from "@/db/schema";
import { requireClubMember } from "@/lib/session";
import {
  baseUrl,
  dateiname,
  erzeugeQrSvgFuerUrl,
  logoAlsDataUrl,
} from "@/lib/qr-code";

/*
  Sammel-QR eines Clubs: der Code führt auf /s/<club.qr_token> → Geräteauswahl →
  melden. Gedacht als EIN Aushang/Etikett für den ganzen Standort, wenn nicht
  jedes Gerät ein eigenes Etikett tragen soll. Der QR wird serverseitig erzeugt.
*/
export default async function ClubQrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireClubMember(id);

  const club = await db.query.clubs.findFirst({
    where: eq(clubs.id, id),
    columns: { name: true, logoUrl: true, qrToken: true },
  });
  if (!club) notFound();

  const meldeUrl = `${baseUrl()}/s/${club.qrToken}`;
  const svg = await erzeugeQrSvgFuerUrl(meldeUrl);
  const pngDataUrl = await QRCode.toDataURL(meldeUrl, {
    margin: 1,
    width: 2048,
    errorCorrectionLevel: "M",
  });
  const logoDataUrl = await logoAlsDataUrl(club.logoUrl);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/clubs/${id}`}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          <ArrowLeft size={14} /> {club.name}
        </Link>
        <QrDownload
          qrSvg={svg}
          qrPngDataUrl={pngDataUrl}
          logoDataUrl={logoDataUrl}
          basisname={`sammel-qr-${dateiname(club.name)}`}
        />
      </div>

      <section className="space-y-4">
        <div className="print:hidden">
          <h1 className="text-xl font-bold">Sammel-QR — {club.name}</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Dieser Code führt auf eine Geräteauswahl: Wer scannt, wählt ein Gerät
            des Clubs und meldet dafür einen Fehler — auch ohne Konto.
          </p>
        </div>
        <div
          className="mx-auto w-full max-w-xs [&_svg]:h-auto [&_svg]:w-full"
          // Der SVG-String stammt vom serverseitigen QR-Generator (qrcode) —
          // vertrauenswürdig, kein Script, unter der CSP erlaubt.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="text-center text-xs text-[var(--color-muted)]">
          Der Code führt zu <span className="font-mono">{meldeUrl}</span>
        </p>
      </section>
    </div>
  );
}
