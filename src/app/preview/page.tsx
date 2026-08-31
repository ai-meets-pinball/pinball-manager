import Link from "next/link";
import {
  ArrowUpRight,
  Boxes,
  CalendarClock,
  FileText,
  Home,
  Library,
  MailPlus,
  MessagesSquare,
  QrCode,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import { MarketingFooter, MarketingNav } from "@/components/site-chrome";
import { STAMMTISCH_URL } from "@/lib/links";

/*
  Öffentliche „Mitmachen"-Seite — die Langfassung der Preview-Einladung, auf die
  der Flippermarkt-Thread verlinkt. Editorial-Stil wie /features (Tokens, Hairline-
  Raster), bewusst mit dezenten Lucide-Icons statt Emojis. Ton: selbstbewusst,
  Feedback erwünscht.
*/
export const metadata = {
  title: "Mitmachen · Preview · Pinball Manager",
  description:
    "Pinball Manager ist in der Preview — auf Einladung. Was die App kann, für wen sie sich lohnt und wie du dabei bist.",
};

const MAILTO =
  "mailto:frg@silverballmania.com?subject=Pinball%20Manager%20Preview%20%E2%80%93%20Einladung%20anfragen";

const koennen = [
  {
    icon: Boxes,
    title: "Maschinen & Stammdaten",
    desc: "Modell aus dem Katalog wählen — Hersteller, Baujahr und Foto kommen automatisch.",
  },
  {
    icon: Wrench,
    title: "Fehler & Reparaturen",
    desc: "Symptom, Ursache, Teile und Kosten je Reparatur — mit Fotos und durchsuchbarer Historie.",
  },
  {
    icon: CalendarClock,
    title: "Wartung & Termine",
    desc: "Wartungspläne mit Fälligkeiten und datierte Termine — jeweils mit Erinnerung.",
  },
  {
    icon: Users,
    title: "Club-Modus",
    desc: "Maschinen und Wissen im Verein oder Stammtisch teilen — mit Rollen für Mitglieder.",
  },
  {
    icon: FileText,
    title: "Handbücher & Dokumente",
    desc: "Handbuch-Fakten als Referenztabellen, dazu Links, Notizen und Dateien je Gerät.",
  },
  {
    icon: QrCode,
    title: "Melden per QR",
    desc: "QR-Etikett am Gerät — auch Gäste ohne Konto melden einen Fehler direkt vor Ort.",
  },
];

const fuerWen = [
  {
    icon: Users,
    title: "Vereine & Clubs",
    desc: "Alle Geräte an einem Ort, gemeinsam gepflegt: wer hat welchen Fehler gemeldet, wer was repariert, was ist bald fällig. Mit Rollen (Owner/Admin/Mitglied) und QR-Codes am Gerät, über die sogar Gäste ohne Konto melden.",
  },
  {
    icon: Library,
    title: "Sammler",
    desc: "Die ganze Sammlung sauber katalogisiert — Modell, Baujahr, Zustand, dazu Handbücher und die komplette Reparatur- und Wartungshistorie je Automat.",
  },
  {
    icon: Home,
    title: "Einzelne Besitzer",
    desc: "Auch bei ein, zwei Automaten den Überblick behalten: Fehler notieren, Wartung mit Erinnerung planen — griffbereit am Handy, direkt an der Maschine.",
  },
];

const gesucht = [
  "Leute, die ihre eigenen Maschinen wirklich eintragen und die App im Alltag nutzen.",
  "Ehrliche Rückmeldungen dazu, was hakt, fehlt oder nervt.",
  "Lust, die Richtung mitzugestalten.",
];

const EYEBROW =
  "mb-3 font-mono text-xs uppercase tracking-[1px] text-[var(--color-faint)]";

export default function PreviewPage() {
  return (
    <div className="min-h-screen">
      <MarketingNav />

      <main className="mx-auto max-w-[1080px] px-5 pb-28 pt-[70px] sm:px-12">
        {/* ===== HERO ===== */}
        <div className="mb-14 max-w-[680px]">
          <div className={EYEBROW}>Preview · Mitmachen</div>
          <h1 className="mb-4 text-[30px] font-bold leading-[1.15] tracking-[-0.4px] sm:text-[40px]">
            Teste Pinball Manager mit.
          </h1>
          <p className="mb-7 text-[16px] leading-[1.7] text-[var(--color-muted)]">
            Aus unseren „KI meets Pinball"-Stammtisch-Runden ist etwas Handfestes
            geworden: eine Web-App, um die eigene(n) Maschine(n) zu verwalten. Wir
            haben sie als Team gebaut, sie läuft stabil genug für den Alltag — und
            wir öffnen sie jetzt für ein paar Leute aus der Community. Der Zugang
            läuft auf Einladung, die Nutzung ist in dieser Phase kostenlos.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={MAILTO}
              className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-primary-fg)] transition-colors hover:bg-[var(--color-accent)]"
            >
              <MailPlus size={17} strokeWidth={1.9} />
              Einladung anfragen
            </a>
            <a
              href={STAMMTISCH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-6 py-3 text-sm font-medium transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Zum Stammtisch-Thread
              <ArrowUpRight size={16} strokeWidth={1.9} />
            </a>
          </div>
        </div>

        {/* ===== WAS DIE APP KANN ===== */}
        <section className="border-t border-[var(--color-border)] pt-12">
          <div className={EYEBROW}>Was die App kann</div>
          <h2 className="mb-8 text-[24px] font-bold tracking-[-0.3px] sm:text-[28px]">
            Verwaltung im Zentrum, Reparatur als Baustein.
          </h2>
          <div className="grid grid-cols-1 gap-px border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2 lg:grid-cols-3">
            {koennen.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-[var(--color-surface)] p-6">
                <Icon
                  size={20}
                  strokeWidth={1.75}
                  className="mb-3 text-[var(--color-accent)]"
                />
                <h3 className="mb-1.5 text-[15px] font-bold">{title}</h3>
                <p className="text-[13px] leading-[1.6] text-[var(--color-muted)]">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== FÜR WEN ===== */}
        <section className="border-t border-[var(--color-border)] py-12 pt-14">
          <div className={EYEBROW}>Für wen</div>
          <h2 className="mb-8 text-[24px] font-bold tracking-[-0.3px] sm:text-[28px]">
            Ob ein Automat oder ein ganzer Vereinsbestand.
          </h2>
          <div className="grid grid-cols-1 gap-px border border-[var(--color-border)] bg-[var(--color-border)] md:grid-cols-3">
            {fuerWen.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-[var(--color-surface)] p-6">
                <Icon
                  size={22}
                  strokeWidth={1.75}
                  className="mb-3.5 text-[var(--color-accent)]"
                />
                <h3 className="mb-2 text-base font-bold">{title}</h3>
                <p className="text-[13px] leading-[1.65] text-[var(--color-muted)]">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== EHRLICH ZUR PREVIEW ===== */}
        <section className="border-t border-[var(--color-border)] py-12 pt-14">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-[50px]">
            <div>
              <div className={EYEBROW}>Ehrlich zur Preview</div>
              <h2 className="mb-3.5 text-[22px] font-bold leading-[1.3] sm:text-[25px]">
                Vieles läuft rund, manches ist noch rau.
              </h2>
              <p className="text-sm leading-[1.7] text-[var(--color-muted)]">
                Preview heißt: der Kern steht und trägt den Alltag, aber es gibt
                Ecken und Kanten, und Details ändern sich noch. Genau dafür machen
                wir das jetzt öffentlich. Dein Feedback ist ausdrücklich erwünscht
                — direkt über den „Problem melden"-Knopf in der App. Je konkreter,
                desto besser.
              </p>
            </div>
            <div>
              <div className={EYEBROW}>Wen wir suchen</div>
              <ul className="flex flex-col gap-2.5">
                {gesucht.map((g) => (
                  <li
                    key={g}
                    className="flex gap-3 text-sm leading-[1.6] text-[var(--color-muted)]"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ===== WIE MITMACHEN ===== */}
        <section className="border-t border-[var(--color-border)] py-14">
          <div className="rounded-[12px] border border-[var(--color-accent)]/40 bg-[var(--color-surface-2)] p-7 sm:p-9">
            <div className="mb-3 font-mono text-xs uppercase tracking-[1px] text-[var(--color-accent)]">
              Wie mitmachen
            </div>
            <h2 className="mb-3.5 text-[22px] font-bold leading-[1.3] sm:text-[25px]">
              Auf Einladung — in zwei Minuten dabei.
            </h2>
            <p className="mb-6 max-w-[620px] text-sm leading-[1.7] text-[var(--color-muted)]">
              Aus Sicherheitsgründen gibt es (noch) keine offene
              Selbstregistrierung. Schreib uns eine kurze Nachricht — im
              Stammtisch-Thread, per PN oder E-Mail. Du bekommst dann einen
              persönlichen Einladungslink und kannst direkt loslegen.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={MAILTO}
                className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-primary-fg)] transition-colors hover:bg-[var(--color-accent)]"
              >
                <MailPlus size={17} strokeWidth={1.9} />
                frg@silverballmania.com
              </a>
              <a
                href={STAMMTISCH_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-6 py-3 text-sm font-medium transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                <MessagesSquare size={16} strokeWidth={1.9} />
                Stammtisch-Thread
                <ArrowUpRight size={15} strokeWidth={1.9} />
              </a>
            </div>
          </div>
        </section>

        {/* ===== DATENSCHUTZ ===== */}
        <section className="border-t border-[var(--color-border)] pt-12">
          <div className="flex items-start gap-4">
            <ShieldCheck
              size={22}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0 text-[var(--color-accent)]"
            />
            <div>
              <h2 className="mb-2 text-base font-bold">Kurz zum Datenschutz</h2>
              <p className="max-w-[680px] text-sm leading-[1.7] text-[var(--color-muted)]">
                Verarbeitet werden nur die Daten, die du selbst einträgst (plus
                dein Konto). Keine Werbung, kein Tracking. Du kannst dein Konto
                samt Daten jederzeit selbst wieder löschen. Details in der{" "}
                <Link
                  href="/datenschutz"
                  className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
                >
                  Datenschutzerklärung
                </Link>{" "}
                und im{" "}
                <Link
                  href="/impressum"
                  className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
                >
                  Impressum
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
