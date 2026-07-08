import { MarketingFooter, MarketingNav } from "@/components/site-chrome";

/*
  Öffentliche Funktionen-Seite — editorial Rebrand (Handoff v2). Texte wie im
  Design; die Reihenfolge spiegelt den Kern der Anwendung (Verwaltung zuerst).
*/

const deepFeatures = [
  {
    tag: "Inventar & Stammdaten", roadmap: false,
    title: "Vollständige Stammdaten je Maschine.",
    desc: "Hersteller, Baujahr, Seriennummer, Zustand, Marktwert und Standort werden pro Maschine geführt und lassen sich exportieren.",
    points: ["Fotos und technische Daten", "Standort- und Eigentumshistorie", "Export für Versicherung oder Inventur"],
  },
  {
    tag: "Standorte & Club-Roster", roadmap: false,
    title: "Gemeinsamer Bestand für Vereine.",
    desc: "Mitglieder sehen den vollständigen Maschinenbestand eines Standorts inklusive Eigentümer und Zustand.",
    points: ["Rollenbasierter Zugriff für Mitglieder", "Bestandsübersicht je Standort", "Gemeinsamer Wartungskalender"],
  },
  {
    tag: "Fehler & Reparaturen", roadmap: false,
    title: "Reparatur-Historie je Maschine.",
    desc: "Jede Reparatur wird mit Datum, Ursache, verwendeten Teilen und Kosten protokolliert und ist durchsuchbar.",
    points: ["Teile- und Kostenerfassung", "Durchsuchbare Historie", "Hinweise bei wiederkehrenden Fehlern"],
  },
  {
    tag: "KI-Diagnose", roadmap: true,
    title: "Geplante Diagnoseunterstützung.",
    desc: "Auf Basis von Handbüchern und dokumentierten Reparaturen sollen wahrscheinliche Ursachen zu einem beschriebenen Symptom vorgeschlagen werden.",
    points: ["Trainiert auf Handbücher und Reparatur-Historie", "Rangfolge wahrscheinlicher Ursachen", "Verweise auf passende Ersatzteile"],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <MarketingNav />

      <main className="mx-auto max-w-[1080px] px-5 pb-28 pt-[70px] sm:px-12">
        <div className="mb-14 max-w-[640px]">
          <div className="mb-3 font-mono text-xs uppercase tracking-[1px] text-[var(--color-faint)]">
            Funktionen
          </div>
          <h1 className="mb-3.5 text-[28px] font-bold tracking-[-0.3px] sm:text-[34px]">
            Verwaltung im Zentrum, Reparatur als Baustein.
          </h1>
          <p className="text-[15px] leading-[1.65] text-[var(--color-muted)]">
            Die Funktionen sind in der Reihenfolge aufgeführt, in der sie den Kern
            der Anwendung ausmachen.
          </p>
        </div>

        {deepFeatures.map((df) => (
          <div
            key={df.tag}
            className="grid grid-cols-1 items-start gap-8 border-t border-[var(--color-border)] py-11 md:grid-cols-2 md:gap-[50px]"
          >
            <div>
              <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
                <div className="font-mono text-[11px] uppercase tracking-[1px] text-[var(--color-faint)]">
                  {df.tag}
                </div>
                {df.roadmap ? (
                  <div className="rounded-[4px] border border-dashed border-[var(--color-border)] px-[7px] py-0.5 font-mono text-[10px] uppercase text-[var(--color-faint)]">
                    In Entwicklung
                  </div>
                ) : null}
              </div>
              <h3 className="mb-3.5 text-[22px] font-bold leading-[1.3]">
                {df.title}
              </h3>
              <p className="text-sm leading-[1.7] text-[var(--color-muted)]">
                {df.desc}
              </p>
            </div>
            <div className="flex flex-col gap-px overflow-hidden rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-line)]">
              {df.points.map((pt) => (
                <div
                  key={pt}
                  className="bg-[var(--color-surface)] px-4 py-3.5 text-[13px]"
                >
                  {pt}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Abschluss: … und vieles mehr + Kontakt-Einladung */}
        <div className="border-t border-[var(--color-border)] py-14 text-center">
          <h3 className="mb-3 text-[22px] font-bold">…und vieles mehr.</h3>
          <p className="mx-auto mb-6 max-w-[520px] text-sm leading-[1.7] text-[var(--color-muted)]">
            Der Funktionsumfang wächst gemeinsam mit unserem
            &bdquo;KI meets Pinball&ldquo;-Stammtisch. Ideen oder Wünsche? Wir
            freuen uns über deine Nachricht.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="mailto:kontakt@pinball-manager.app?subject=Idee%20f%C3%BCr%20Pinball%20Manager"
              className="inline-block rounded-[var(--radius)] bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-primary-fg)] transition-colors hover:bg-[var(--color-accent)]"
            >
              Kontaktiere uns
            </a>
            <a
              href="https://www.flippermarkt.de/forum/threads/ki-meets-pinball-gemeinsames-projekt-per-teams-stammtisch-wer-macht-mit.292100/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-[var(--radius)] border border-[var(--color-border)] px-6 py-3 text-sm font-medium transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Zum Stammtisch-Thread ↗
            </a>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
