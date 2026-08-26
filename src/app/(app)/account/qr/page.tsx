import QRCode from "qrcode";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QrDownload } from "@/components/qr-download";
import { ensureUserSammlungToken, getUserLogoUrl } from "@/db/queries";
import { requireUser } from "@/lib/session";
import {
  baseUrl,
  erzeugeQrSvgFuerUrl,
  logoAlsDataUrl,
} from "@/lib/qr-code";

/*
  Sammel-QR der PRIVATEN Sammlung einer Person: der Code führt auf
  /s/<user.qr_token> → Auswahl der eigenen (privaten) Geräte → melden. Der Token
  wird bei Erstaufruf erzeugt (ensureUserSammlungToken). Das persönliche Logo
  (user_settings.logo_url) landet auf dem Etikett.
*/
export default async function AccountQrPage() {
  const user = await requireUser();
  const token = await ensureUserSammlungToken(user.id);
  const logoUrl = await getUserLogoUrl(user.id);

  const meldeUrl = `${baseUrl()}/s/${token}`;
  const svg = await erzeugeQrSvgFuerUrl(meldeUrl);
  const pngDataUrl = await QRCode.toDataURL(meldeUrl, {
    margin: 1,
    width: 2048,
    errorCorrectionLevel: "M",
  });
  const logoDataUrl = await logoAlsDataUrl(logoUrl);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/account"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          <ArrowLeft size={14} /> Konto
        </Link>
        <QrDownload
          qrSvg={svg}
          qrPngDataUrl={pngDataUrl}
          logoDataUrl={logoDataUrl}
          basisname="sammel-qr-private-sammlung"
        />
      </div>

      <section className="space-y-4">
        <div className="print:hidden">
          <h1 className="text-xl font-bold">Sammel-QR — deine Sammlung</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Dieser Code führt auf eine Auswahl deiner privaten Geräte: Wer scannt,
            wählt ein Gerät und meldet dafür einen Fehler — auch ohne Konto.
            {logoUrl
              ? ""
              : " Tipp: Hinterlege im Konto ein Logo, dann erscheint es auf dem Etikett."}
          </p>
        </div>
        <div
          className="mx-auto w-full max-w-xs [&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="text-center text-xs text-[var(--color-muted)]">
          Der Code führt zu <span className="font-mono">{meldeUrl}</span>
        </p>
      </section>
    </div>
  );
}
