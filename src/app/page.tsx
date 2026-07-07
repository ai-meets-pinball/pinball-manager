import Link from "next/link";
import { Sparkles, Star, Target, Users, Wrench } from "lucide-react";
import { MarketingFooter, MarketingNav } from "@/components/site-chrome";

/*
  Öffentliche Startseite — Arcade-Marketing (Claude-Design-Handoff), Inhalte an
  das echte Produkt angepasst: KI ist Roadmap (Phase 3), keine erfundenen Preise.
*/

const heroStats = [
  { value: "0 €", label: "Für Einzelne" },
  { value: "Club", label: "Geteilte Roster" },
  { value: "KI", label: "Auf der Roadmap" },
];

const mockMachines = [
  { name: "Attack From Mars", status: "GUT", bg: "rgba(77,214,138,0.15)", color: "#4dd68a" },
  { name: "Twilight Zone", status: "REPARATUR", bg: "rgba(255,106,61,0.18)", color: "var(--color-primary-soft)" },
  { name: "Godzilla", status: "GUT", bg: "rgba(77,214,138,0.15)", color: "#4dd68a" },
];

const marqueeLabels = [
  "MASCHINEN-INVENTAR", "CLUB-ROSTER", "REPARATUR-LOGS", "KI-DIAGNOSE",
  "TEILE-TRACKING", "FEHLER-VERLAUF", "FOTO-DOKU", "OPDB-ABGLEICH",
];

const features = [
  { icon: Target, iconBg: "rgba(255,106,61,0.15)", iconColor: "var(--color-primary-soft)", title: "Maschinen-Inventar", desc: "Jede Maschine mit Daten, Fotos und komplettem Service-Verlauf an einem Ort." },
  { icon: Users, iconBg: "rgba(124,92,255,0.15)", iconColor: "var(--color-accent-soft)", title: "Club-Roster", desc: "Teile einen Standort-Roster mit deinem Club und sieh, wer was wartet." },
  { icon: Wrench, iconBg: "rgba(255,106,61,0.15)", iconColor: "var(--color-primary-soft)", title: "Reparatur-Log", desc: "Jede Reparatur mit Teilen, Kosten und Notizen — Muster werden mit der Zeit sichtbar." },
  { icon: Sparkles, iconBg: "rgba(124,92,255,0.15)", iconColor: "var(--color-accent-soft)", title: "KI-Diagnose", desc: "Symptom beschreiben, wahrscheinliche Ursachen bekommen. Auf der Roadmap (Phase 3)." },
];

const clubRows = [
  { name: "Medieval Madness", owner: "D. Ruiz" },
  { name: "Fish Tales", owner: "Club" },
  { name: "Cactus Canyon", owner: "M. Ortiz" },
];

export default function HomePage() {
  return (
    <div className="grain relative min-h-screen overflow-x-hidden">
      <div className="relative z-[2]">
        <MarketingNav />

        {/* ===== HERO ===== */}
        <section className="mx-auto grid max-w-[1320px] items-center gap-10 px-6 pb-16 pt-16 sm:px-12 md:grid-cols-[1.05fr_0.95fr] md:pt-[88px]">
          <div className="relative z-[2]">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[rgba(255,106,61,0.4)] bg-[rgba(255,106,61,0.08)] px-3.5 py-[7px] font-mono text-xs uppercase tracking-[1.5px] text-[var(--color-primary-soft)]">
              <span className="h-1.5 w-1.5 animate-flicker rounded-full bg-[var(--color-primary)]" />
              KI-Reparaturdiagnose · in Entwicklung
            </div>

            <h1 className="mb-[22px] font-display text-[42px] leading-[1.08] sm:text-[58px]">
              Halte jeden<br />
              <span className="text-[var(--color-primary)]">Flipper</span> am Laufen.
            </h1>

            <p className="mb-[34px] max-w-[460px] text-lg leading-[1.65] text-[var(--color-muted)]">
              Verwalte jede Maschine, die dir gehört, und jede, die dein Club
              betreibt. Dokumentiere Fehler und Reparaturen — und verliere nie
              wieder ein Spiel an einen toten Schalter.
            </p>

            <div className="mb-11 flex flex-wrap gap-3.5">
              <Link
                href="/register"
                className="rounded-[10px] bg-[var(--color-primary)] px-7 py-[15px] font-bold text-[var(--color-primary-fg)] shadow-[0_8px_30px_rgba(255,106,61,0.35)] transition-transform hover:-translate-y-0.5"
              >
                Kostenlos starten →
              </Link>
              <Link
                href="/features"
                className="rounded-[10px] border border-[var(--color-border)] px-7 py-[15px] font-semibold text-[var(--color-fg)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent-soft)]"
              >
                Funktionen ansehen
              </Link>
            </div>

            <div className="flex gap-[34px]">
              {heroStats.map((s) => (
                <div key={s.label}>
                  <div className="font-display text-2xl text-[var(--color-primary-soft)]">
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[1px] text-[var(--color-faint)]">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* App-Mockup — als dunkles Gerät gescoped (.dark), auch im Light-Mode. */}
          <div className="relative z-[2] flex justify-center">
            <div
              className="dark w-[300px] animate-float-slow overflow-hidden rounded-[32px] border-2 border-white/10"
              style={{
                background: "linear-gradient(160deg, #1b1626, #100c18)",
                boxShadow: "0 40px 90px rgba(0,0,0,0.55)",
              }}
            >
              <div className="flex justify-between px-5 pb-2.5 pt-4 font-mono text-[11px] text-[#6b6478]">
                <span>9:41</span>
                <span>●●●</span>
              </div>
              <div className="border-b border-white/8 px-5 pb-[18px] pt-1">
                <div className="mb-1.5 text-[11px] uppercase tracking-[1.5px] text-[var(--color-faint)]">
                  Meine Garage
                </div>
                <div className="font-display text-xl">Medieval Madness</div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-success)] shadow-[0_0_8px_#4dd68a]" />
                  <span className="text-xs font-semibold text-[var(--color-success)]">
                    Betriebsbereit
                  </span>
                </div>
              </div>
              <div
                className="m-5 rounded-[10px] border border-[rgba(124,92,255,0.35)] p-3.5"
                style={{ background: "var(--color-inset)", boxShadow: "inset 0 0 20px rgba(124,92,255,0.08)" }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[1px] text-[var(--color-accent-soft)]">
                    <Sparkles size={11} /> KI-Diagnose
                  </span>
                  <span className="rounded-full bg-white/8 px-1.5 py-0.5 font-mono text-[9px] uppercase text-[var(--color-faint)]">
                    bald
                  </span>
                </div>
                <div className="font-mono text-xs leading-[1.6] text-[#d9d3ff]">
                  Linker Flipper schwach. Vermutlich Spulenhülse verschlissen — Teil
                  #A-13866.
                </div>
              </div>
              <div className="flex flex-col gap-2.5 px-5 pb-[22px]">
                {mockMachines.map((m) => (
                  <div
                    key={m.name}
                    className="flex items-center justify-between rounded-lg bg-white/3 px-3 py-2.5"
                  >
                    <span className="text-[13px] text-[var(--color-fg)]">{m.name}</span>
                    <span
                      className="rounded-full px-2.5 py-[3px] text-[11px] font-bold"
                      style={{ background: m.bg, color: m.color }}
                    >
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== MARQUEE ===== */}
        <div className="overflow-hidden border-y border-[var(--color-border)] bg-white/[0.015] py-5">
          <div className="flex w-max animate-marquee items-center font-mono text-[13px] uppercase tracking-[2px] text-[var(--color-faint)]">
            {[...marqueeLabels, ...marqueeLabels].map((txt, i) => (
              <span key={i} className="flex items-center gap-[34px] pr-[34px]">
                {txt}
                <Star size={11} className="text-[var(--color-accent)]" fill="currentColor" />
              </span>
            ))}
          </div>
        </div>

        {/* ===== FEATURES ===== */}
        <section className="mx-auto max-w-[1280px] px-6 py-24 sm:px-12">
          <div className="mx-auto mb-16 max-w-[620px] text-center">
            <div className="mb-3.5 font-mono text-xs uppercase tracking-[2px] text-[var(--color-primary-soft)]">
              Das Werkzeug
            </div>
            <h2 className="mb-4 font-display text-[32px] leading-[1.2] sm:text-[38px]">
              Alles, was die Werkstatt braucht,{" "}
              <span className="text-[var(--color-accent)]">nichts sonst.</span>
            </h2>
            <p className="text-base leading-[1.6] text-[var(--color-muted)]">
              Von der Garage mit einem Addams Family bis zum Club mit vierzig
              Maschinen.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-[18px] border border-[var(--color-border)] p-6 transition-transform hover:-translate-y-1.5 hover:border-[rgba(255,106,61,0.4)]"
                style={{
                  background:
                    "linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                }}
              >
                <div
                  className="mb-5 flex h-[46px] w-[46px] items-center justify-center rounded-xl"
                  style={{ background: f.iconBg }}
                >
                  <f.icon size={22} style={{ color: f.iconColor }} />
                </div>
                <h3 className="mb-2.5 text-[17px]">{f.title}</h3>
                <p className="text-sm leading-[1.6] text-[var(--color-muted)]">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== CLUB / REPAIR SPLIT ===== */}
        <section className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-6 pb-24 pt-10 sm:px-12 md:grid-cols-2">
          <div
            className="rounded-[22px] border border-[rgba(124,92,255,0.25)] p-11"
            style={{
              background:
                "radial-gradient(circle at 20% 0%, rgba(124,92,255,0.18), transparent 60%), var(--color-surface)",
            }}
          >
            <div className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-[var(--color-accent-soft)]">
              Club-Modus
            </div>
            <h3 className="mb-3.5 font-display text-[26px]">Ein Roster, der ganze Club.</h3>
            <p className="mb-[22px] text-[15px] leading-[1.65] text-[var(--color-muted)]">
              Teile einen Maschinen-Roster mit deinem Club, weise Eigentümer zu und
              behalte den Zustand über den ganzen Standort im Blick.
            </p>
            <div className="flex flex-col gap-2.5">
              {clubRows.map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between rounded-[10px] bg-[var(--color-overlay)] px-4 py-3"
                >
                  <span className="text-[13px] text-[var(--color-fg)]">{row.name}</span>
                  <span className="text-xs text-[var(--color-faint)]">{row.owner}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-[22px] border border-[rgba(255,106,61,0.25)] p-11"
            style={{
              background:
                "radial-gradient(circle at 80% 0%, rgba(255,106,61,0.18), transparent 60%), var(--color-surface)",
            }}
          >
            <div className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-[var(--color-primary-soft)]">
              Reparatur-Log + KI
            </div>
            <h3 className="mb-3.5 font-display text-[26px]">Diagnose, bevor du das Glas öffnest.</h3>
            <p className="mb-[22px] text-[15px] leading-[1.65] text-[var(--color-muted)]">
              Beschreibe das Symptom und bekomme eine Rangliste wahrscheinlicher
              Ursachen — gespeist aus Handbüchern und vergangenen Reparaturen.
              <span className="text-[var(--color-faint)]"> (Roadmap, Phase 3.)</span>
            </p>
            <div
              className="rounded-xl border border-[rgba(255,106,61,0.3)] p-4 font-mono text-[13px] leading-[1.6] text-[var(--color-primary-soft)]"
              style={{ background: "var(--color-inset)" }}
            >
              &bdquo;Rechter Rampen-Diverter feuert nicht&ldquo; &rarr;
              Diverter-Spule (Q4) prüfen,
              Opto-Board checken, 20V-Sicherung F19 verifizieren.
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="px-6 pb-32 pt-16 text-center sm:px-12">
          <h2 className="mb-4 font-display text-[28px] sm:text-[34px]">
            Bereit für eine straffere Sammlung?
          </h2>
          <p className="mb-7 text-base text-[var(--color-muted)]">
            Kostenlos für eine Maschine. Keine Kreditkarte.
          </p>
          <Link
            href="/register"
            className="inline-flex rounded-[10px] bg-[var(--color-primary)] px-9 py-[17px] text-base font-bold text-[var(--color-primary-fg)] shadow-[0_10px_40px_rgba(255,106,61,0.4)] transition-transform hover:-translate-y-0.5"
          >
            Jetzt kostenlos starten →
          </Link>
        </section>

        <MarketingFooter />
      </div>
    </div>
  );
}
