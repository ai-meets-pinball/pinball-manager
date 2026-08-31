import { MarketingFooter, MarketingNav } from "@/components/site-chrome";

/*
  Impressum (Pflicht nach § 5 DDG). ACHTUNG: Die eckigen Platzhalter
  [ … ] müssen vor dem öffentlichen Onboarding durch die echten Angaben
  (Name/Anschrift) ersetzt werden — das ist keine Rechtsberatung.
*/
export const metadata = { title: "Impressum · Pinball Manager" };

const H2 = "mb-2 mt-8 text-lg font-semibold text-[var(--color-fg)]";

export default function ImpressumPage() {
  return (
    <div className="min-h-screen">
      <MarketingNav />

      <main className="mx-auto max-w-[760px] px-5 pb-28 pt-[70px] sm:px-12">
        <h1 className="mb-6 text-[28px] font-bold tracking-[-0.3px] sm:text-[34px]">
          Impressum
        </h1>

        <div className="text-[15px] leading-[1.7] text-[var(--color-muted)]">
          <h2 className="mt-0 mb-2 text-lg font-semibold text-[var(--color-fg)]">
            Angaben gemäß § 5 DDG
          </h2>
          <p>
            [Vor- und Nachname]
            <br />
            [Straße und Hausnummer]
            <br />
            [PLZ und Ort]
            <br />
            Deutschland
          </p>

          <h2 className={H2}>Kontakt</h2>
          <p>
            E-Mail:{" "}
            <a
              href="mailto:kontakt@pinball-manager.app"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              kontakt@pinball-manager.app
            </a>
          </p>

          <h2 className={H2}>Verantwortlich i. S. d. § 18 Abs. 2 MStV</h2>
          <p>[Vor- und Nachname], Anschrift wie oben.</p>

          <h2 className={H2}>Verbraucherstreitbeilegung</h2>
          <p>
            Wir sind nicht verpflichtet und nicht bereit, an
            Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
            teilzunehmen.
          </p>

          <h2 className={H2}>Haftung für Inhalte und Links</h2>
          <p>
            Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten
            nach den allgemeinen Gesetzen verantwortlich. Für Inhalte externer
            Links sind ausschließlich deren Betreiber verantwortlich; zum
            Zeitpunkt der Verlinkung waren keine Rechtsverstöße erkennbar.
            Bekannt gewordene Rechtsverletzungen entfernen wir umgehend.
          </p>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
