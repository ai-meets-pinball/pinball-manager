import { ChevronRight, Sparkles, Target, Users, Wrench } from "lucide-react";
import { MarketingFooter, MarketingNav } from "@/components/site-chrome";

/*
  Öffentliche Funktionen-Seite (Arcade-Design). Inhalte an das echte Produkt
  angepasst — KI-Diagnose ist als Roadmap (Phase 3) gekennzeichnet.
*/

const deepFeatures = [
  {
    tag: "Inventar", tagColor: "var(--color-primary-soft)", icon: Target,
    title: "Deine ganze Sammlung, immer aktuell.",
    desc: "Maschinen in Sekunden anlegen, Zustand und Baujahr erfassen und jedes ein- oder ausgebaute Teil festhalten.",
    points: ["Fotos & Datenblätter je Maschine", "OPDB-Abgleich füllt Daten automatisch", "Eigentümer- und Standortangaben"],
    reverse: false,
  },
  {
    tag: "Club-Modus", tagColor: "var(--color-accent-soft)", icon: Users,
    title: "Einen Standort führen, keine Tabelle.",
    desc: "Gib Club-Mitgliedern Einblick in jede Maschine auf der Fläche, wer sie besitzt und in welchem Zustand sie ist.",
    points: ["Rollen für Mitglieder (Admin/Mitglied)", "Geteilte Maschinen-Roster", "Zugriff sichtbar im App-Code geregelt"],
    reverse: true,
  },
  {
    tag: "Reparatur-Log", tagColor: "var(--color-primary-soft)", icon: Wrench,
    title: "Nie vergessen, was du schon repariert hast.",
    desc: "Jede Reparatur ist mit Teilen und Kosten datiert, sodass wiederkehrende Probleme sichtbar werden.",
    points: ["Teile- und Kostenerfassung", "Durchsuchbarer Reparatur-Verlauf", "Fehler getrennt von Reparaturen"],
    reverse: false,
  },
  {
    tag: "KI-Diagnose · Roadmap", tagColor: "var(--color-accent-soft)", icon: Sparkles,
    title: "Ein Reparatur-Profi in der Tasche.",
    desc: "Symptom in normaler Sprache beschreiben und eine Rangliste wahrscheinlicher Ursachen bekommen. Für Phase 3 geplant.",
    points: ["Aus Handbüchern + Community-Fixes", "Rangliste wahrscheinlicher Ursachen", "Direkt zu Teilenummern"],
    reverse: true,
  },
];

export default function FeaturesPage() {
  return (
    <div className="grain relative min-h-screen overflow-x-hidden">
      <div className="relative z-[2]">
        <MarketingNav />

        <main className="mx-auto max-w-[1100px] px-6 pb-32 pt-20 sm:px-12">
          <div className="mx-auto mb-[70px] max-w-[640px] text-center">
            <div className="mb-3.5 font-mono text-xs uppercase tracking-[2px] text-[var(--color-primary-soft)]">
              Funktionen
            </div>
            <h1 className="mb-4 font-display text-[34px] leading-[1.15] sm:text-[42px]">
              Gebaut von Leuten, die ihre Maschinen selbst reparieren.
            </h1>
            <p className="text-base leading-[1.6] text-[var(--color-muted)]">
              Jede Funktion existiert, weil um 23 Uhr eine Spule durchgebrannt ist
              und jemand wissen musste, warum.
            </p>
          </div>

          {deepFeatures.map((df) => (
            <div
              key={df.tag}
              className="grid grid-cols-1 items-center gap-8 border-b border-[var(--color-border)] py-10 md:grid-cols-2 md:gap-[50px] md:py-[60px]"
            >
              <div className={df.reverse ? "md:order-2" : ""}>
                <div
                  className="mb-3.5 font-mono text-[11px] uppercase tracking-[2px]"
                  style={{ color: df.tagColor }}
                >
                  {df.tag}
                </div>
                <h3 className="mb-4 font-display text-[24px] leading-[1.3] sm:text-[28px]">
                  {df.title}
                </h3>
                <p className="mb-5 text-[15px] leading-[1.7] text-[var(--color-muted)]">
                  {df.desc}
                </p>
                <div className="flex flex-col gap-2.5">
                  {df.points.map((pt) => (
                    <div
                      key={pt}
                      className="flex items-center gap-2 text-sm text-[var(--color-fg)]"
                    >
                      <ChevronRight
                        size={16}
                        className="shrink-0"
                        style={{ color: df.tagColor }}
                      />
                      {pt}
                    </div>
                  ))}
                </div>
              </div>
              <div className={df.reverse ? "md:order-1" : ""}>
                <div
                  className="flex min-h-[220px] items-center justify-center rounded-[18px] border border-[var(--color-border)] p-8"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                  }}
                >
                  <df.icon size={64} strokeWidth={1.4} style={{ color: df.tagColor }} />
                </div>
              </div>
            </div>
          ))}
        </main>

        <MarketingFooter />
      </div>
    </div>
  );
}
