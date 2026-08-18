import Link from "next/link";
import { MarketingFooter, MarketingNav } from "@/components/site-chrome";
import { baseUrl, erzeugeQrSvgFuerUrl } from "@/lib/qr-code";

/*
  Öffentliche „Log"-Seite (Änderungsprotokoll) — bewusst NICHT in der Navigation
  verlinkt, nur per /log erreichbar. Nutzerorientierte Neuerungen der letzten
  zwei Wochen, plus ein paar Beispiel-QR-Etiketten (die QR-Fehlermeldung war das
  Highlight). Design folgt der Startseite (Tokens, hell/dunkel).
*/
export const metadata = {
  title: "Änderungsprotokoll — Pinball Manager",
  description: "Was in den letzten zwei Wochen neu dazugekommen ist.",
};

const hairlineGrid =
  "gap-px border border-[var(--color-border)] bg-[var(--color-border)]";

const qrFeatures = [
  {
    titel: "Druck-Studio",
    text: "Eigene Etikettenmaße, herstellerspezifische Scorecards, A4 mit Schnittmarken und optional das Vereins-Logo.",
  },
  {
    titel: "Fotos anhängen",
    text: "Zur Meldung passen mehrere Fotos — direkt vom Handy am Gerät, auch als Gast.",
  },
  {
    titel: "Ohne Konto",
    text: "Gäste melden mit Namen und Symptom. Ein Login ist bevorzugt, aber keine Voraussetzung.",
  },
];

const updates = [
  {
    eyebrow: "Handbuch & Wissen",
    items: [
      "Handbuch (PDF) per KI in Referenztabellen umwandeln — Spulen, Schalter, Lampen, Sicherungen, Teile, Regeln. Das PDF wird dabei nicht gespeichert.",
      "Alternative ganz ohne KI: fertiges JSON aus dem eigenen ChatGPT-/Claude-Abo einfügen.",
      "Troubleshooting-Guides je Modell; Wissen privat, im Club oder öffentlich teilen.",
    ],
  },
  {
    eyebrow: "Betrieb & Wartung",
    items: [
      "Betriebsstatus je Maschine — spielbereit, eingeschränkt oder außer Betrieb, automatisch aus offenen Fehlern oder manuell gesetzt.",
      "Übersicht mit Kennzahlen: offene und kritische Fehler, letzte Wartung, nicht spielbereite Geräte.",
      "Wartungspläne mit Fälligkeiten und Erinnerungen.",
    ],
  },
  {
    eyebrow: "Clubs & Rollen",
    items: [
      "Mehrere Clubs, mehrere Besitzer je Gerät, eigenes Vereins-Logo.",
      "Rollen klarer getrennt: Club-Rollen gelten je Club, globale plattformweit — eine Person kann mehrere halten.",
    ],
  },
  {
    eyebrow: "App & Qualität",
    items: [
      "Feedback und Fehlermeldungen direkt in der App.",
      "Aufgeräumte Maschinen-Detailseite und kompaktere Übersicht.",
      "Sicherheits-Review mit gehärteten Uploads und Zugriffsprüfungen.",
    ],
  },
];

export default async function LogPage() {
  const beispiele = await Promise.all(
    [
      { name: "Godzilla (Pro)", url: `${baseUrl()}/features` },
      { name: "Medieval Madness", url: baseUrl() },
      { name: "Attack From Mars", url: `${baseUrl()}/preise` },
    ].map(async (b) => ({ ...b, svg: await erzeugeQrSvgFuerUrl(b.url) })),
  );

  return (
    <div className="min-h-screen">
      <MarketingNav />

      {/* ===== HERO ===== */}
      <section className="mx-auto max-w-[1000px] px-5 pb-12 pt-16 sm:px-12 md:pt-[88px]">
        <div className="mb-[22px] font-mono text-xs uppercase tracking-[1px] text-[var(--color-faint)]">
          Änderungsprotokoll · 4.–18. August 2026
        </div>
        <h1 className="mb-[22px] text-[34px] font-bold leading-[1.18] tracking-[-0.5px] sm:text-[46px]">
          Neu in den letzten zwei Wochen.
        </h1>
        <p className="max-w-[560px] text-[17px] leading-[1.7] text-[var(--color-muted)]">
          Viel Neues rund um Fehlererfassung, Handbücher und den laufenden
          Betrieb. Das Highlight: Fehler lassen sich jetzt direkt am Gerät per
          QR-Code melden — auch ohne Konto.
        </p>
      </section>

      {/* ===== QR-HIGHLIGHT ===== */}
      <section className="mx-auto max-w-[1200px] border-t border-[var(--color-border)] px-5 py-[60px] sm:px-12">
        <div className="mb-10 max-w-[640px]">
          <div className="mb-3 font-mono text-xs uppercase tracking-[1px] text-[var(--color-accent)]">
            Highlight · QR-Fehlermeldung
          </div>
          <h2 className="mb-3.5 text-[26px] font-bold tracking-[-0.3px] sm:text-[30px]">
            Fehler melden — direkt am Gerät.
          </h2>
          <p className="text-[15px] leading-[1.65] text-[var(--color-muted)]">
            Jede Maschine bekommt ein QR-Etikett. Wer den Code scannt, landet auf
            einer öffentlichen Melde-Seite: Symptom beschreiben, Namen angeben —
            fertig. Priorität und Status vergibt anschließend der Betreiber.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {beispiele.map((b) => (
            <div
              key={b.name}
              className="flex flex-col items-center gap-3 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
            >
              <div
                className="aspect-square w-40 rounded-lg bg-white p-3 [&>svg]:h-full [&>svg]:w-full"
                // Serverseitig erzeugtes, vertrauenswürdiges QR-SVG (qrcode-Paket).
                dangerouslySetInnerHTML={{ __html: b.svg }}
              />
              <div className="text-center">
                <div className="text-sm font-bold">{b.name}</div>
                <div className="font-mono text-[11px] uppercase tracking-[0.5px] text-[var(--color-faint)]">
                  Fehler melden
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 font-mono text-[11px] leading-[1.6] text-[var(--color-faint)]">
          Beispiel-Etiketten — diese Codes führen auf unsere Website. Am echten
          Gerät zeigt der Code direkt auf die Melde-Seite der Maschine.
        </p>

        <div className={`mt-8 grid grid-cols-1 sm:grid-cols-3 ${hairlineGrid}`}>
          {qrFeatures.map((f) => (
            <div key={f.titel} className="bg-[var(--color-surface)] px-6 py-5">
              <h3 className="mb-1.5 text-sm font-bold">{f.titel}</h3>
              <p className="text-[13px] leading-[1.6] text-[var(--color-muted)]">
                {f.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== WEITERE NEUERUNGEN ===== */}
      <section className="mx-auto max-w-[1200px] border-t border-[var(--color-border)] px-5 py-[60px] sm:px-12">
        <div className="mb-10 max-w-[640px]">
          <div className="mb-3 font-mono text-xs uppercase tracking-[1px] text-[var(--color-faint)]">
            Weitere Neuerungen
          </div>
          <h2 className="text-[26px] font-bold tracking-[-0.3px] sm:text-[30px]">
            Vom Handbuch bis zum Wartungsplan.
          </h2>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 ${hairlineGrid}`}>
          {updates.map((u) => (
            <div key={u.eyebrow} className="bg-[var(--color-surface)] p-7">
              <div className="mb-3.5 font-mono text-[11px] uppercase tracking-[1px] text-[var(--color-faint)]">
                {u.eyebrow}
              </div>
              <ul className="space-y-2.5">
                {u.items.map((it, i) => (
                  <li
                    key={i}
                    className="flex gap-2.5 text-[14px] leading-[1.6] text-[var(--color-muted)]"
                  >
                    <span className="mt-[9px] h-[5px] w-[5px] flex-none rounded-full bg-[var(--color-accent)]" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="mx-auto max-w-[1200px] border-t border-[var(--color-border)] px-5 pb-24 pt-[60px] text-center sm:px-12">
        <h2 className="mb-3.5 text-[26px] font-bold">Schon dabei?</h2>
        <p className="mb-6 text-[15px] text-[var(--color-muted)]">
          Melde dich an oder sieh dir an, was Pinball Manager kann.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="rounded-[var(--radius)] bg-[var(--color-primary)] px-[26px] py-3.5 font-semibold text-[var(--color-primary-fg)] transition-colors hover:bg-[var(--color-accent)]"
          >
            Anmelden
          </Link>
          <Link
            href="/features"
            className="rounded-[var(--radius)] border border-[var(--color-border)] px-[26px] py-3.5 font-medium transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            Funktionen ansehen
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
