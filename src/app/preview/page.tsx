import Link from "next/link";
import {
  ArrowUpRight,
  MailPlus,
  MessagesSquare,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { MarketingFooter, MarketingNav } from "@/components/site-chrome";
import { STAMMTISCH_URL } from "@/lib/links";

/*
  Öffentliche „Mitmachen"-Seite — bewusst schlank: nur Einstieg, ehrliche
  Einordnung der Preview und der Weg zum Konto. Was die App kann und für wen,
  steht auf / und /features — hier wird nur verlinkt, nicht wiederholt.
  Editorial-Stil wie /features (Tokens, Hairline-Raster), dezente Lucide-Icons.
*/
export const metadata = {
  title: "Mitmachen · Preview · Pinball Manager",
  description:
    "Pinball Manager ist in der Preview — kostenlos, Zugang derzeit auf Einladung. Kurz anfragen, dann geht es los.",
};

const MAILTO =
  "mailto:frg@silverballmania.com?subject=Pinball%20Manager%20Preview%20%E2%80%93%20Frage";

const gesucht = [
  "Leute, die ihre eigenen Maschinen wirklich eintragen und die App im Alltag nutzen.",
  "Ehrliche Rückmeldungen dazu, was hakt, fehlt oder nervt.",
  "Lust, die Richtung mitzugestalten.",
];

const schritte = [
  ["01 · Anfragen", "Kurze Mail — wir richten die Einladung ein."],
  ["02 · Konto", "Über den Einladungslink Name und Passwort setzen — eine Minute."],
  ["03 · Loslegen", "Erste Maschine aus dem Katalog wählen, Foto kommt automatisch."],
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
            Die App läuft stabil genug für den Alltag, und wir öffnen sie jetzt
            für alle, die Flipper betreiben — im Verein, in der Location oder
            zu Hause. Die Nutzung ist in dieser Phase kostenlos; der Zugang läuft
            derzeit über eine Einladung — schreib uns kurz. Was die App
            kann, steht auf der{" "}
            <Link
              href="/features"
              className="font-medium text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              Funktionen-Seite
            </Link>
            .
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:frg@silverballmania.com?subject=Pinball%20Manager%20%E2%80%93%20Zugang%20anfragen"
              className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-primary-fg)] transition-colors hover:bg-[var(--color-accent)]"
            >
              <UserPlus size={17} strokeWidth={1.9} />
              Zugang anfragen
            </a>
            <Link
              href="/features"
              className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-6 py-3 text-sm font-medium transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Alle Funktionen im Detail
            </Link>
          </div>
        </div>

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
            <h2 className="mb-5 text-[22px] font-bold leading-[1.3] sm:text-[25px]">
              In zwei Minuten dabei.
            </h2>
            <ol className="mb-7 flex max-w-[620px] flex-col gap-2.5">
              {schritte.map(([k, v]) => (
                <li key={k} className="flex gap-3 text-[14px]">
                  <span className="whitespace-nowrap font-mono text-[11px] font-bold text-[var(--color-accent)]">
                    {k}
                  </span>
                  <span className="text-[var(--color-muted)]">{v}</span>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:frg@silverballmania.com?subject=Pinball%20Manager%20%E2%80%93%20Zugang%20anfragen"
                className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-primary-fg)] transition-colors hover:bg-[var(--color-accent)]"
              >
                <UserPlus size={17} strokeWidth={1.9} />
                Zugang anfragen
              </a>
            </div>
            <p className="mt-6 max-w-[620px] text-sm leading-[1.7] text-[var(--color-muted)]">
              Fragen vorab, oder du willst gleich einen ganzen Verein anlegen?
              Schreib uns — per{" "}
              <a
                href={MAILTO}
                className="inline-flex items-center gap-1 font-medium text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
              >
                <MailPlus size={14} strokeWidth={1.9} />
                E-Mail
              </a>{" "}
              oder im{" "}
              <a
                href={STAMMTISCH_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
              >
                <MessagesSquare size={14} strokeWidth={1.9} />
                Flippermarkt-Thread
                <ArrowUpRight size={13} strokeWidth={1.9} />
              </a>
              .
            </p>
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
