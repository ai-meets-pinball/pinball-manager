import Link from "next/link";
import { MarketingFooter, MarketingNav } from "@/components/site-chrome";

/*
  „Preise" → Nutzungsmodell. Es gibt (noch) keine Tarife: Pinball Manager wird
  gerade gemeinsam mit dem „KI meets Pinball"-Stammtisch entwickelt und ist in
  dieser Phase kostenlos. Ein Modell folgt später.
*/

const faqs = [
  { q: "Was kostet Pinball Manager gerade?", a: "In der aktuellen Entwicklungsphase nichts. Die Nutzung ist kostenlos, ein Nutzungsmodell entsteht gemeinsam mit dem Stammtisch." },
  { q: "Kann ich Maschinen erfassen, die mir nicht gehören?", a: "Ja. Im Club-Roster lassen sich auch Maschinen anderer Mitglieder einsehen und mitverwalten." },
  { q: "Was leistet die KI-Diagnose bereits?", a: "Sie befindet sich in Entwicklung (Roadmap Phase 3) und ist noch nicht Teil der Anwendung." },
  { q: "Kann ich bestehende Daten importieren?", a: "Ja, CSV-Import ist vorgesehen, damit bestehende Sammlungen ohne Abtippen übernommen werden können." },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <MarketingNav />

      <main className="mx-auto max-w-[1140px] px-5 pb-28 pt-[70px] sm:px-12">
        <div className="max-w-[640px]">
          <div className="mb-3 font-mono text-xs uppercase tracking-[1px] text-[var(--color-faint)]">
            Nutzungsmodell
          </div>
          <h1 className="mb-4 text-[28px] font-bold tracking-[-0.3px] sm:text-[34px]">
            Das Nutzungsmodell entsteht gerade.
          </h1>
          <p className="text-[15px] leading-[1.7] text-[var(--color-muted)]">
            Pinball Manager wird aktuell gemeinsam mit unserem{" "}
            <a
              href="https://www.flippermarkt.de/forum/threads/ki-meets-pinball-gemeinsames-projekt-per-teams-stammtisch-wer-macht-mit.292100/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              &bdquo;KI meets Pinball&ldquo;-Stammtisch
            </a>{" "}
            entwickelt. In dieser Phase ist die Nutzung kostenlos — ein konkretes
            Modell folgt, sobald sich der Funktionsumfang gesetzt hat.
          </p>
        </div>

        {/* Status-Block */}
        <div className="mt-10 grid grid-cols-1 items-center gap-6 rounded-[10px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-9 sm:grid-cols-[auto_1fr] sm:gap-8">
          <div className="w-fit rounded-[4px] border border-dashed border-[var(--color-border)] px-2.5 py-[5px] font-mono text-[11px] uppercase tracking-[1px] text-[var(--color-faint)]">
            In Entwicklung
          </div>
          <div>
            <h2 className="mb-2 text-[18px] font-bold">
              Aktuell kostenlos — Modell folgt
            </h2>
            <p className="mb-5 text-sm leading-[1.65] text-[var(--color-muted)]">
              Wir bauen die Verwaltung zusammen mit dem Stammtisch aus. Solange das
              läuft, kannst du deine Sammlung ohne Kosten anlegen und pflegen.
            </p>
            <Link
              href="/register"
              className="inline-block rounded-[var(--radius)] bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-primary-fg)] transition-colors hover:bg-[var(--color-accent)]"
            >
              Jetzt kostenlos starten
            </Link>
          </div>
        </div>

        <div className="mt-20">
          <h2 className="mb-6 text-xl font-bold">Fragen</h2>
          <div className="flex flex-col gap-px border border-[var(--color-border)] bg-[var(--color-border)]">
            {faqs.map((q) => (
              <div key={q.q} className="bg-[var(--color-surface)] px-6 py-5">
                <div className="mb-1.5 text-sm font-bold">{q.q}</div>
                <div className="text-[13px] leading-[1.6] text-[var(--color-muted)]">
                  {q.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
