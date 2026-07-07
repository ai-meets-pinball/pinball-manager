import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingFooter, MarketingNav } from "@/components/site-chrome";

/*
  Öffentliche „Preise"-Seite. An die Realität angepasst: Pinball Manager ist ein
  kostenloses, offenes Lehrprojekt („KI meets Pinball"). Keine erfundenen Tarife —
  die drei Spalten beschreiben Nutzungsarten, alle kostenlos.
*/

const plans = [
  {
    name: "Einzeln", price: "0 €", subtitle: "Deine eigene Sammlung.",
    items: ["Unbegrenzt Maschinen", "Fehler & Reparatur-Log", "OPDB-Datenabgleich", "Foto-Upload"],
    bg: "var(--color-surface)", border: "var(--color-border)", tagColor: "var(--color-muted)",
    btnBg: "var(--color-border)", btnColor: "var(--color-fg)", cta: "Konto erstellen", featured: false,
  },
  {
    name: "Club", price: "0 €", subtitle: "Für Vereine und Standorte.",
    items: ["Alles aus Einzeln", "Geteilte Club-Roster", "Rollen (Admin / Mitglied)", "Gemeinsamer Zustands-Blick"],
    bg: "linear-gradient(160deg, rgba(255,106,61,0.16), var(--color-surface))", border: "rgba(255,106,61,0.5)", tagColor: "var(--color-primary-soft)",
    btnBg: "var(--color-primary)", btnColor: "var(--color-primary-fg)", cta: "Club anlegen", featured: true,
  },
  {
    name: "Lehrgruppe", price: "0 €", subtitle: "Für die KI-meets-Pinball-Gruppe.",
    items: ["Alles aus Club", "Lesbarer, offener Code", "Selbst hostbar", "KI-Diagnose (Roadmap)"],
    bg: "var(--color-surface)", border: "rgba(124,92,255,0.35)", tagColor: "var(--color-accent-soft)",
    btnBg: "rgba(124,92,255,0.18)", btnColor: "var(--color-accent-soft)", cta: "Loslegen", featured: false,
  },
];

const faqs = [
  { q: "Was kostet Pinball Manager?", a: "Nichts. Es ist ein offenes Lehrprojekt — alle Funktionen sind kostenlos und der Code ist einsehbar." },
  { q: "Kann ich Maschinen tracken, die mir nicht gehören?", a: "Ja — über Club-Roster siehst und wartest du Maschinen anderer Mitglieder mit." },
  { q: "Diagnostiziert die KI schon Fehler?", a: "Noch nicht. Die KI-Diagnose ist für Phase 3 der Roadmap geplant; heute liegt der Fokus auf Verwaltung und Reparatur-Log." },
  { q: "Woher kommen die Maschinendaten?", a: "Aus der Open Pinball Database (OPDB): beim Anlegen füllt der Abgleich Hersteller, Modell, Baujahr und Foto automatisch." },
];

export default function PricingPage() {
  return (
    <div className="grain relative min-h-screen overflow-x-hidden">
      <div className="relative z-[2]">
        <MarketingNav />

        <main className="mx-auto max-w-[1180px] px-6 pb-32 pt-20 sm:px-12">
          <div className="mx-auto mb-[60px] max-w-[600px] text-center">
            <div className="mb-3.5 font-mono text-xs uppercase tracking-[2px] text-[var(--color-primary-soft)]">
              Preise
            </div>
            <h1 className="mb-4 font-display text-[34px] leading-[1.15] sm:text-[42px]">
              Kostenlos. Und offen.
            </h1>
            <p className="text-base leading-[1.6] text-[var(--color-muted)]">
              Pinball Manager ist ein Lehrprojekt, kein SaaS. Alle drei Nutzungsarten
              sind gratis — wähle einfach, wozu es passt.
            </p>
          </div>

          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-[22px] p-8 ${plan.featured ? "md:scale-[1.04]" : ""}`}
                style={{ background: plan.bg, border: `1px solid ${plan.border}` }}
              >
                {plan.featured ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-primary)] px-4 py-[5px] text-[11px] font-bold uppercase tracking-[1px] text-[var(--color-primary-fg)]">
                    Empfohlen
                  </div>
                ) : null}
                <div
                  className="mb-3 font-mono text-xs uppercase tracking-[2px]"
                  style={{ color: plan.tagColor }}
                >
                  {plan.name}
                </div>
                <div className="mb-1.5 flex items-baseline gap-1.5">
                  <span className="font-display text-[40px]">{plan.price}</span>
                </div>
                <p className="mb-[26px] text-[13px] text-[var(--color-faint)]">
                  {plan.subtitle}
                </p>
                <div className="mb-[30px] flex flex-col gap-3.5">
                  {plan.items.map((it) => (
                    <div
                      key={it}
                      className="flex items-start gap-2.5 text-sm text-[var(--color-muted)]"
                    >
                      <Check
                        size={16}
                        className="mt-0.5 shrink-0"
                        style={{ color: plan.tagColor }}
                      />
                      {it}
                    </div>
                  ))}
                </div>
                <Link
                  href="/register"
                  className="block rounded-[10px] py-3.5 text-center text-sm font-bold transition-opacity hover:opacity-90"
                  style={{ background: plan.btnBg, color: plan.btnColor }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-[90px] text-center">
            <h2 className="mb-[30px] font-display text-[24px] sm:text-[26px]">
              Fragen, die sich lohnen
            </h2>
            <div className="mx-auto grid max-w-[900px] grid-cols-1 gap-[22px] text-left md:grid-cols-2">
              {faqs.map((q) => (
                <div
                  key={q.q}
                  className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-overlay)] p-6"
                >
                  <div className="mb-2 text-[15px] font-bold">{q.q}</div>
                  <div className="text-sm leading-[1.6] text-[var(--color-muted)]">
                    {q.a}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <MarketingFooter />
      </div>
    </div>
  );
}
