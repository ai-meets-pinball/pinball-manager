import Link from "next/link";
import { MarketingFooter, MarketingNav } from "@/components/site-chrome";

/*
  Öffentliche Startseite — editorial Rebrand (Claude-Design-Handoff v2).
  Texte deutsch, alles über Tokens → hell/dunkel funktioniert.

  Positionierung: Verwaltungs- und Reparatursoftware für alle, die Flipper
  betreiben — Verein, Location oder privat. Kein Stammtisch-Projekt, keine reine
  Sammler-Katalogisierung. Der Funktionsumfang hier spiegelt /preview; die
  Langfassung steht auf /features.
*/

const heroStats = [
  { value: "2.200+", label: "Modelle im Katalog" },
  { value: "0 €", label: "Aktuell kostenlos" },
  { value: "Preview", label: "Zugang auf Einladung" },
];

const mockFields = [
  { label: "Hersteller", value: "Williams" },
  { label: "Baujahr", value: "1997" },
  { label: "Offene Fehler", value: "0" },
  { label: "Nächste Wartung", value: "in 12 Tagen" },
];

const mockMachines = [
  { name: "Attack From Mars", status: "SPIELBEREIT", tone: "var(--color-success)" },
  { name: "Twilight Zone", status: "EINGESCHRÄNKT", tone: "var(--color-warn)" },
  { name: "Godzilla", status: "SPIELBEREIT", tone: "var(--color-success)" },
];

const features = [
  { num: "01", title: "Maschinen & Stammdaten", desc: "Modell aus dem Katalog wählen — Hersteller, Baujahr und Foto kommen automatisch. Eigene Fotos, Notizen und Dateien je Gerät." },
  { num: "02", title: "Fehler & Reparaturen", desc: "Symptom, Ursache, Teile und Kosten je Reparatur — mit Fotos und durchsuchbarer Historie." },
  { num: "03", title: "Betrieb & Wartung", desc: "Betriebsstatus je Maschine, Wartungspläne mit Fälligkeiten und Termine — jeweils mit Erinnerung." },
  { num: "04", title: "Club-Modus", desc: "Maschinen und Wissen im Verein oder in der Location teilen — mit Rollen für Mitglieder." },
  { num: "05", title: "Handbücher per KI", desc: "Ein PDF-Handbuch wird zu Referenztabellen: Spulen, Schalter, Lampen, Sicherungen, Teile. Das PDF selbst wird nicht gespeichert." },
  { num: "06", title: "Melden per QR", desc: "QR-Etikett am Gerät — auch Gäste ohne Konto melden einen Fehler direkt vor Ort." },
];

const clubRows = [
  { name: "Medieval Madness", owner: "D. Ruiz" },
  { name: "Fish Tales", owner: "Verein" },
  { name: "Cactus Canyon", owner: "M. Ortiz" },
];

const audiences = [
  {
    title: "Vereine & Clubs",
    desc: "Alle Geräte an einem Ort, gemeinsam gepflegt: wer hat welchen Fehler gemeldet, wer was repariert, was ist bald fällig — mit Rollen und QR-Code zum Melden direkt am Gerät.",
  },
  {
    title: "Betreiber & Locations",
    desc: "Welche Maschine ist spielbereit, welche eingeschränkt? Gäste melden Fehler per QR, das Team sieht Prioritäten, Wartung und Reparatur-Historie je Gerät.",
  },
  {
    title: "Private Besitzer",
    desc: "Ob eine Maschine oder eine ganze Sammlung: Fehler notieren, Wartung mit Erinnerung planen, Handbuch-Fakten griffbereit — am Handy, direkt an der Maschine.",
  },
];

/** Feine haarlinien-getrennte Rasterfläche (1px-Lücken zeigen die Rahmenfarbe). */
const hairlineGrid =
  "gap-px border border-[var(--color-border)] bg-[var(--color-border)]";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <MarketingNav />

      {/* ===== HERO ===== */}
      <section className="mx-auto grid max-w-[1240px] items-center gap-10 px-5 pb-16 pt-16 sm:px-12 md:grid-cols-[1.05fr_0.95fr] md:gap-14 md:pt-[88px]">
        <div>
          <div className="mb-[22px] font-mono text-xs uppercase tracking-[1px] text-[var(--color-faint)]">
            Verwaltung, Wartung und Reparatur für Flipperautomaten
          </div>

          <h1 className="mb-[22px] text-[34px] font-bold leading-[1.18] tracking-[-0.5px] sm:text-[46px]">
            Alle Maschinen, alle Daten, an einem Ort.
          </h1>

          <p className="mb-[34px] max-w-[480px] text-[17px] leading-[1.7] text-[var(--color-muted)]">
            Pinball Manager führt Stammdaten, Betriebsstatus, Wartung und
            Reparatur-Historie jeder Maschine — ob im Verein, in der Location
            oder im eigenen Keller. Handbücher werden per KI zu Referenztabellen.
          </p>

          <div className="mb-12 flex flex-wrap gap-3">
            <Link
              href="/preview"
              className="rounded-[var(--radius)] bg-[var(--color-primary)] px-[26px] py-3.5 font-semibold text-[var(--color-primary-fg)] transition-colors hover:bg-[var(--color-accent)]"
            >
              Einladung anfragen
            </Link>
            <Link
              href="/login"
              className="rounded-[var(--radius)] border border-[var(--color-border)] px-[26px] py-3.5 font-medium transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Anmelden
            </Link>
          </div>

          <div className="flex flex-wrap gap-10 border-t border-[var(--color-border)] pt-6">
            {heroStats.map((s) => (
              <div key={s.label}>
                <div className="font-mono text-xl font-bold">{s.value}</div>
                <div className="mt-1 text-xs text-[var(--color-faint)]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* App-Mockup (helle Karte — folgt dem Theme) */}
        <div className="flex justify-center">
          <div className="w-[300px] max-w-full overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_20px_50px_rgba(30,28,26,0.08)]">
            <div className="flex justify-between px-5 pb-2.5 pt-4 font-mono text-[11px] text-[var(--color-faint)]">
              <span>9:41</span>
              <span>●●●</span>
            </div>
            <div className="border-b border-[var(--color-line)] px-5 pb-4 pt-1">
              <div className="mb-1.5 text-[11px] uppercase tracking-[1px] text-[var(--color-faint)]">
                Meine Maschinen
              </div>
              <div className="text-[19px] font-bold">Medieval Madness</div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-success)]" />
                <span className="text-xs font-semibold text-[var(--color-success)]">
                  Spielbereit
                </span>
              </div>
            </div>
            <div className="m-5 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3.5">
              <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[1px] text-[var(--color-faint)]">
                Stammdaten
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {mockFields.map((f) => (
                  <div key={f.label}>
                    <div className="text-[10px] text-[var(--color-faint)]">
                      {f.label}
                    </div>
                    <div className="mt-0.5 font-semibold">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 px-5 pb-5">
              {mockMachines.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center justify-between rounded-md bg-[var(--color-surface-2)] px-3 py-2.5"
                >
                  <span className="text-[13px]">{m.name}</span>
                  <span
                    className="rounded-[4px] px-2 py-[3px] text-[11px] font-semibold"
                    style={{
                      color: m.tone,
                      background: `color-mix(in srgb, ${m.tone} 14%, transparent)`,
                    }}
                  >
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="mx-auto max-w-[1200px] border-t border-[var(--color-border)] px-5 py-[70px] sm:px-12">
        <div className="mb-12 max-w-[620px]">
          <div className="mb-3 font-mono text-xs uppercase tracking-[1px] text-[var(--color-faint)]">
            Funktionsumfang
          </div>
          <h2 className="mb-3.5 text-[26px] font-bold tracking-[-0.3px] sm:text-[30px]">
            Vom Inventar bis zur Reparatur-Historie.
          </h2>
          <p className="text-[15px] leading-[1.65] text-[var(--color-muted)]">
            Verwaltung steht im Zentrum. Fehlererfassung, Wartung und KI bauen
            darauf auf.{" "}
            <Link
              href="/features"
              className="font-medium text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              Alle Funktionen im Detail
            </Link>
          </p>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${hairlineGrid}`}>
          {features.map((f) => (
            <div key={f.num} className="bg-[var(--color-surface)] px-[22px] py-[26px]">
              <div className="mb-2.5 font-mono text-[11px] text-[var(--color-faint)]">
                {f.num}
              </div>
              <h3 className="mb-2 text-base font-bold">{f.title}</h3>
              <p className="text-[13px] leading-[1.6] text-[var(--color-muted)]">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FÜR WEN ===== */}
      <section className="mx-auto max-w-[1200px] px-5 pb-[70px] sm:px-12">
        <div className="mb-12 max-w-[620px]">
          <div className="mb-3 font-mono text-xs uppercase tracking-[1px] text-[var(--color-faint)]">
            Für wen
          </div>
          <h2 className="mb-3.5 text-[26px] font-bold tracking-[-0.3px] sm:text-[30px]">
            Ob ein Automat oder ein ganzer Bestand.
          </h2>
          <p className="text-[15px] leading-[1.65] text-[var(--color-muted)]">
            Egal ob ein Gerät zu Hause, eine Location oder ein geteilter Bestand
            im Verein — dieselbe App wächst mit.
          </p>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-3 ${hairlineGrid}`}>
          {audiences.map((a) => (
            <div
              key={a.title}
              className="bg-[var(--color-surface)] px-[22px] py-[26px]"
            >
              <h3 className="mb-2 text-base font-bold">{a.title}</h3>
              <p className="text-[13px] leading-[1.6] text-[var(--color-muted)]">
                {a.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CLUB / REPAIR ===== */}
      <section className="mx-auto max-w-[1200px] px-5 pb-[70px] sm:px-12">
        <div className={`grid grid-cols-1 md:grid-cols-2 ${hairlineGrid}`}>
          <div className="bg-[var(--color-surface)] p-9">
          <div className="mb-3.5 font-mono text-[11px] uppercase tracking-[1px] text-[var(--color-faint)]">
            Club-Modus
          </div>
          <h3 className="mb-3 text-[21px] font-bold">
            Gemeinsamer Maschinenbestand für Verein oder Location.
          </h3>
          <p className="mb-[22px] text-sm leading-[1.65] text-[var(--color-muted)]">
            Mitglieder sehen den vollständigen Bestand, inklusive Eigentümer und
            Betriebsstatus. Rollen regeln, wer eintragen, reparieren oder nur
            melden darf.
          </p>
          <div className="flex flex-col gap-px bg-[var(--color-line)]">
            {clubRows.map((row) => (
              <div
                key={row.name}
                className="flex items-center justify-between bg-[var(--color-surface-2)] px-3.5 py-3"
              >
                <span className="text-[13px]">{row.name}</span>
                <span className="text-xs text-[var(--color-faint)]">
                  {row.owner}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--color-surface)] p-9">
          <div className="mb-3.5 font-mono text-[11px] uppercase tracking-[1px] text-[var(--color-faint)]">
            Fehlererfassung &amp; Reparatur-Log
          </div>
          <h3 className="mb-3 text-[21px] font-bold">Jede Reparatur dokumentiert.</h3>
          <p className="mb-[22px] text-sm leading-[1.65] text-[var(--color-muted)]">
            Symptom, Ursache, verwendete Teile und Kosten werden pro Maschine
            protokolliert und sind durchsuchbar.
          </p>
          <div className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3.5 font-mono text-xs leading-[1.7] text-[var(--color-muted)]">
            22.06.2026 — Rechter Ramp-Diverter reagiert nicht. Ursache: Spule Q4
            defekt. Teil #A-13866 ersetzt.
          </div>
        </div>
        </div>
      </section>

      {/* ===== KI ===== */}
      <section className="mx-auto max-w-[1200px] px-5 pb-[70px] sm:px-12">
        <div className="grid grid-cols-1 items-center gap-6 rounded-[10px] border border-[var(--color-accent)]/40 bg-[var(--color-surface-2)] p-9 sm:grid-cols-[auto_1fr] sm:gap-8">
          <div className="w-fit rounded-[4px] border border-[var(--color-accent)]/40 px-2.5 py-[5px] font-mono text-[11px] uppercase tracking-[1px] text-[var(--color-accent)]">
            KI · im Einsatz
          </div>
          <div>
            <h3 className="mb-2 text-[18px] font-bold">
              Handbuch-Fakten und Reparaturvorschläge.
            </h3>
            <p className="text-sm leading-[1.65] text-[var(--color-muted)]">
              Aus einem PDF-Handbuch werden Spulen-, Schalter- und Teiletabellen
              je Modell. Zu einem gemeldeten Fehler schlägt die KI Diagnose,
              Maßnahme und Teile vor — aus dem vorhandenen Maschinen-Wissen.
              Als Nächstes: Bauteil-Erkennung per Foto.
            </p>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="mx-auto max-w-[1200px] border-t border-[var(--color-border)] px-5 pb-24 pt-[60px] text-center sm:px-12">
        <h2 className="mb-3.5 text-[26px] font-bold">
          In der Preview — auf Einladung.
        </h2>
        <p className="mb-6 text-[15px] text-[var(--color-muted)]">
          Aktuell kostenlos nutzbar. Eine kurze Nachricht genügt, dann bekommst
          du einen persönlichen Einladungslink.
        </p>
        <Link
          href="/preview"
          className="inline-block rounded-[var(--radius)] bg-[var(--color-primary)] px-[30px] py-[15px] font-semibold text-[var(--color-primary-fg)] transition-colors hover:bg-[var(--color-accent)]"
        >
          Einladung anfragen
        </Link>
      </section>

      <MarketingFooter />
    </div>
  );
}
