import Link from "next/link";
import { ilike } from "drizzle-orm";
import { MarketingFooter, MarketingNav } from "@/components/site-chrome";
import { db } from "@/db";
import { clubs } from "@/db/schema";
import { baseUrl, erzeugeQrSvgFuerUrl } from "@/lib/qr-code";

/*
  Englischer One-Pager zum Weitergeben — bewusst NICHT in der Navigation
  verlinkt (wie /log), nur per /tour erreichbar. Er fasst zusammen, was Start-,
  Funktions- und Mitmachen-Seite auf Deutsch verteilt erzählen, damit ein Link
  genügt.

  Jede Behauptung hier ist gegen src/app/features/page.tsx (geprüfte deutsche
  Fassung) und src/db/schema.ts belegt. NICHT behaupten: Seriennummer,
  Marktwert, Standort, Datenexport, Reparatur-Fotos — das gibt es alles nicht.

  Die Seite ist die einzige englische Fläche im Repo; es gibt keine i18n. Das
  Wurzel-Layout setzt <html lang="de">, deshalb trägt der Seitenrumpf hier
  lang="en" — sonst lesen Screenreader und Übersetzer den Text als Deutsch.
*/
export const metadata = {
  title: "Pinball Manager — a tour",
  description:
    "What Pinball Manager does: machine records, faults, repairs, maintenance and manual data for clubs, locations and private collections.",
  // Erreichbar über den Link, aber nicht über Google: die Seite ist für
  // einzelne Empfänger gedacht und soll der deutschen Startseite keine
  // Konkurrenz in der Suche machen. Erstes robots-Metadatum im Repo.
  robots: { index: false, follow: false },
};

/** Feine haarlinien-getrennte Rasterfläche — wie auf der Startseite. */
const hairlineGrid =
  "gap-px border border-[var(--color-border)] bg-[var(--color-border)]";

const EYEBROW =
  "mb-3 font-mono text-xs uppercase tracking-[1px] text-[var(--color-faint)]";

/* Übersetzt aus `deepFeatures` in src/app/features/page.tsx — dort steht die
   geprüfte deutsche Fassung. Nichts hinzugefügt. */
const capabilities = [
  {
    num: "01",
    title: "Every machine on record",
    desc: "Pick the model from a catalogue of 2,200+ entries and the manufacturer, year and photo come with it. Add your own photos, notes, links and documents per machine.",
  },
  {
    num: "02",
    title: "Faults and repair history",
    desc: "Log a fault with its symptom and track it: open → acknowledged → in progress → fixed. Repairs record the date, diagnosis, parts used, cost and time — and stay searchable.",
  },
  {
    num: "03",
    title: "Know what is playable",
    desc: "Every machine carries an operating status — ready, limited or out of service — derived from its open faults or set by hand. The overview shows what is not playable right now.",
  },
  {
    num: "04",
    title: "Maintenance that comes back around",
    desc: "Recurring tasks per machine with due dates and email reminders. Named plans can be reused across machines, and due work shows up on the dashboard before someone trips over it.",
  },
  {
    num: "05",
    title: "Manuals become reference tables",
    desc: "Upload a PDF manual and a model turns it into searchable tables — coils, switches, lamps, fuses, parts, rules. The PDF itself is never stored, only the facts.",
  },
  {
    num: "06",
    title: "Shared knowledge, your call",
    desc: "Knowledge lives on the model, so everyone with that machine benefits. Keep an entry private, share it inside your club, or make it public.",
  },
];

/* Aus src/app/log/page.tsx — die QR-Meldung ist für eine Location das stärkste
   Argument und steht deshalb als eigener Abschnitt da. */
const qrPoints = [
  {
    title: "A code on the machine",
    desc: "Scan it, describe the symptom, attach photos from your phone. The fault lands on the right machine — nobody has to find it in a list.",
  },
  {
    title: "Guests need no account",
    desc: "A player who finds a dead flipper can report it by name and symptom. Signing in is preferred, not required.",
  },
  {
    title: "One code for a whole floor",
    desc: "A collection code lets someone pick the machine from a list first, then report. The report is marked as chosen from a list.",
  },
  {
    title: "Labels you can actually print",
    desc: "Custom label sizes, manufacturer-specific scorecards, A4 sheets with crop marks, and your club or personal logo.",
  },
];

/* Mockup der Maschinenliste — dieselbe Karte wie components/machine-card.tsx,
   englisch beschriftet. Inertes Markup, damit die Seite Server-Komponente bleibt. */
const mockMachines = [
  { name: "Medieval Madness", year: "1997", club: "Pinball Friends", due: 0 },
  { name: "Twilight Zone", year: "1993", club: null, due: 1 },
  { name: "Attack From Mars", year: "1995", club: "Pinball Friends", due: 0 },
];

/* Stand der Dinge — was heute trägt, was noch nicht gebaut ist und was
   nachkommen kann. Dieser Abschnitt ist der Grund, warum man dem Rest der
   Seite glauben kann; er darf deshalb nie schöner werden als die Wahrheit.
   Fehlendes wird als „noch nicht" benannt, nicht als „gibt es nicht" —
   Datenexport, App oder API sind nicht ausgeschlossen, nur unnötig bisher. */
const honest = [
  "The interface is in German. This page is the only English one — if that is a blocker, say so and it moves up the list.",
  "AI repair suggestions from a reported fault work today — they pre-fill a repair for a human to check and save. Photo-based part recognition is planned, not built.",
  "There is no way to sign up right now — not open, not by invitation. When that changes it will be free; there is no paid plan waiting behind a curtain.",
  "Plenty can still be added, or is simply not implemented yet — a publicly shared collection, links to rulesets, video, whatever turns out to be useful. A proper English version belongs on that list, and it would likely be its own edition rather than a translation: repair vocabulary this specific rarely survives being translated.",
];

export default async function TourPage() {
  /* Echte Beispiel-Codes, serverseitig als Vektor erzeugt — keine fremden
     Bildquellen (die CSP ließe sie ohnehin nicht zu). Beide führen auf die
     Startseite, es sind Muster. Muster wie /features und /log. */
  const qrEtikett = await erzeugeQrSvgFuerUrl(baseUrl());
  const qrScorecard = await erzeugeQrSvgFuerUrl(baseUrl());

  /* Vereinslogo für die Beispiel-Scorecard. Defensiv wie auf /log: schlägt die
     Abfrage fehl oder fehlt das Logo, bleibt die Karte einfach ohne — eine
     öffentliche Seite darf daran nie scheitern. */
  let clubLogo: string | null = null;
  try {
    const club = await db.query.clubs.findFirst({
      where: ilike(clubs.name, "%FlipperFreunde Fellbach%"),
      columns: { logoUrl: true },
    });
    clubLogo = club?.logoUrl ?? null;
  } catch {
    clubLogo = null;
  }

  return (
    <div className="min-h-screen" lang="en">
      <MarketingNav />

      {/* ===== HERO ===== */}
      <section className="mx-auto grid max-w-[1240px] items-center gap-10 px-5 pb-16 pt-16 sm:px-12 md:grid-cols-[1.05fr_0.95fr] md:gap-14 md:pt-[88px]">
        <div>
          <div className={EYEBROW}>
            Maintenance and repair software for pinball machines
          </div>

          <h1 className="mb-[22px] text-[34px] font-bold leading-[1.18] tracking-[-0.5px] sm:text-[46px]">
            Every machine, every fault, every fix — or just manage your
            collection.
          </h1>

          <p className="mb-[34px] max-w-[480px] text-[17px] leading-[1.7] text-[var(--color-muted)]">
            Pinball Manager keeps the records, operating status, maintenance and
            repair history of every machine you look after — in a club, at a
            location, or in your own basement. One dashboard tells you what is
            not playable, what is overdue and what is coming up; manuals become
            searchable reference tables.
          </p>

          <div className="mb-12 flex flex-wrap gap-3">
            <Link
              href="/features"
              className="rounded-[var(--radius)] border border-[var(--color-border)] px-[26px] py-3.5 font-medium transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              All features (German)
            </Link>
          </div>

          <div className="flex flex-wrap gap-10 border-t border-[var(--color-border)] pt-6">
            <div>
              <div className="font-mono text-xl font-bold">2,200+</div>
              <div className="mt-1 text-xs text-[var(--color-faint)]">
                Models in the catalogue
              </div>
            </div>
            <div>
              <div className="font-mono text-xl font-bold">$0</div>
              <div className="mt-1 text-xs text-[var(--color-faint)]">
                Free while in preview
              </div>
            </div>
          </div>
        </div>

        {/* App-Mockup (folgt dem Theme) */}
        <div className="flex justify-center">
          <div className="w-[300px] max-w-full overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_20px_50px_rgba(30,28,26,0.08)]">
            <div className="flex justify-between px-5 pb-2.5 pt-4 font-mono text-[11px] text-[var(--color-faint)]">
              <span>9:41</span>
              <span>●●●</span>
            </div>
            <div className="flex items-end justify-between px-5 pb-3 pt-1">
              <div>
                <div className="text-[19px] font-bold">Machines</div>
                <div className="text-[11px] text-[var(--color-muted)]">
                  3 machines
                </div>
              </div>
              <span className="rounded-[var(--radius)] bg-[var(--color-primary)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-primary-fg)]">
                + New
              </span>
            </div>
            <div className="mx-5 mb-3 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-2 text-[11px] text-[var(--color-faint)]">
              Search …
            </div>
            <div className="flex flex-col gap-2 px-5 pb-5">
              {mockMachines.map((m) => (
                <div
                  key={m.name}
                  className="flex gap-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5"
                >
                  <div className="h-12 w-12 shrink-0 rounded-[var(--radius)] bg-[var(--color-border)]/40" />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">
                      {m.name}
                    </div>
                    <div className="text-[11px] text-[var(--color-muted)]">
                      {m.year}
                    </div>
                    {m.club ? (
                      <div className="mt-0.5 text-[10px] text-[var(--color-muted)]">
                        ⚇ {m.club}
                      </div>
                    ) : null}
                    {m.due > 0 ? (
                      <span className="mt-1 inline-flex rounded-full border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-[var(--color-danger)]">
                        {m.due} service due
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== PROBLEM ===== */}
      <section className="mx-auto max-w-[1200px] border-t border-[var(--color-border)] px-5 py-[70px] sm:px-12">
        <div className="mb-10 max-w-[620px]">
          <div className={EYEBROW}>Why it exists</div>
          <h2 className="mb-3.5 text-[26px] font-bold tracking-[-0.3px] sm:text-[30px]">
            Repair knowledge scatters. Then it is gone.
          </h2>
        </div>
        <div
          className={`grid grid-cols-1 sm:grid-cols-3 ${hairlineGrid}`}
        >
          {[
            "Manuals sit in PDFs, answers sit in forum threads, and the rest sits in one person's head.",
            "Mid-repair you need one specific fact — which coil, which switch number, which part — and it is never at hand.",
            "Nobody writes the fix down, so the same fault gets diagnosed from scratch a year later.",
          ].map((t) => (
            <div
              key={t}
              className="bg-[var(--color-surface)] px-[22px] py-[26px] text-[13px] leading-[1.6] text-[var(--color-muted)]"
            >
              {t}
            </div>
          ))}
        </div>
      </section>

      {/* ===== WAS ES KANN ===== */}
      <section className="mx-auto max-w-[1200px] border-t border-[var(--color-border)] px-5 py-[70px] sm:px-12">
        <div className="mb-12 max-w-[620px]">
          <div className={EYEBROW}>What it does</div>
          <h2 className="mb-3.5 text-[26px] font-bold tracking-[-0.3px] sm:text-[30px]">
            From the inventory to the repair history.
          </h2>
          <p className="text-[15px] leading-[1.65] text-[var(--color-muted)]">
            Record-keeping is the centre of it. Faults, maintenance and the AI
            features build on top.
          </p>
        </div>

        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${hairlineGrid}`}
        >
          {capabilities.map((c) => (
            <div
              key={c.num}
              className="bg-[var(--color-surface)] px-[22px] py-[26px]"
            >
              <div className="mb-2.5 font-mono text-[11px] text-[var(--color-faint)]">
                {c.num}
              </div>
              <h3 className="mb-2 text-base font-bold">{c.title}</h3>
              <p className="text-[13px] leading-[1.6] text-[var(--color-muted)]">
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== QR AM GERÄT ===== */}
      <section className="mx-auto max-w-[1200px] border-t border-[var(--color-border)] px-5 py-[70px] sm:px-12">
        <div className="mb-12 max-w-[620px]">
          <div className={EYEBROW}>At the machine</div>
          <h2 className="mb-3.5 text-[26px] font-bold tracking-[-0.3px] sm:text-[30px]">
            The person who finds the fault is the one holding a phone.
          </h2>
          <p className="text-[15px] leading-[1.65] text-[var(--color-muted)]">
            Put a QR code on the machine. Whoever notices something wrong
            reports it where it happened, in about twenty seconds.
          </p>
        </div>

        {/* Zwei echte Beispiele — Etikett und Scorecard. Beide auf weißem Grund
            wie gedruckt, damit der Code in hell UND dunkel scannbar bleibt.
            Aufbau wie im Druck-Studio (qr-print.tsx) bzw. auf /log. */}
        <div className="mb-12 grid grid-cols-1 items-center gap-8 sm:grid-cols-[auto_1fr]">
          <div className="flex w-[200px] max-w-full flex-col items-center gap-3 rounded-[10px] border border-[var(--color-border)] bg-white p-5 text-black shadow-[0_12px_34px_rgba(30,28,26,0.12)]">
            <div
              className="aspect-square w-32 [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qrEtikett }}
            />
            <div className="text-center">
              <div className="text-[13px] font-bold leading-tight">
                Godzilla (Pro)
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.5px] text-black/60">
                Report a fault
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[1px] text-[var(--color-faint)]">
              And the same code on a scorecard — real Stern format, 140 × 75 mm
            </div>
            <div className="flex aspect-[140/75] w-[420px] max-w-full flex-col items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-white p-3 text-black shadow-[0_12px_34px_rgba(30,28,26,0.12)]">
              <p className="flex-none text-center text-[13px] font-bold leading-tight">
                Godzilla (Pro) | Stern
              </p>
              <div className="flex min-h-0 w-full flex-1 items-center justify-center gap-2">
                {clubLogo ? (
                  <div className="flex h-full flex-1 items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={clubLogo}
                      alt="FlipperFreunde Fellbach club logo"
                      className="max-h-full max-w-[90%] object-contain"
                    />
                  </div>
                ) : null}
                <div
                  className="flex h-full flex-1 items-center justify-center [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: qrScorecard }}
                />
              </div>
              <p className="flex-none text-center text-[9px] leading-tight">
                Something broken? Scan and report — no account needed.
              </p>
            </div>
            <p className="mt-3 font-mono text-[10px] text-[var(--color-faint)]">
              Printed to size, so it slides into the card holder the machine
              already has. Club logo included. Both example codes lead to the
              home page.
            </p>
          </div>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 ${hairlineGrid}`}>
          {qrPoints.map((q) => (
            <div
              key={q.title}
              className="bg-[var(--color-surface)] px-[22px] py-[26px]"
            >
              <h3 className="mb-2 text-base font-bold">{q.title}</h3>
              <p className="text-[13px] leading-[1.6] text-[var(--color-muted)]">
                {q.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== TURNIERMODUS ===== */}
      <section className="mx-auto max-w-[1200px] border-t border-[var(--color-border)] px-5 py-[70px] sm:px-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-14">
          <div>
            <div className={EYEBROW}>Tournament day</div>
            <h2 className="mb-3.5 text-[26px] font-bold tracking-[-0.3px] sm:text-[30px]">
              On tournament day, a dead machine is an emergency.
            </h2>
            <p className="mb-5 text-[15px] leading-[1.65] text-[var(--color-muted)]">
              A club owner or admin flips tournament mode on. From then until it
              is switched off, the dashboard raises an alarm for as long as any
              open, unacknowledged fault stands on a club machine — and it keeps
              refreshing itself, so nobody has to sit there reloading.
            </p>
            <p className="text-[15px] leading-[1.65] text-[var(--color-muted)]">
              Acknowledging a fault clears the alarm without pretending it is
              fixed. Players keep reporting through the QR code on the machine,
              which is exactly where the trouble shows up first.
            </p>
          </div>

          {/* Mockup der Dashboard-Kacheln (siehe Notiz „mention the dashboard"):
              dieselbe Anatomie wie dashboard/page.tsx, inertes Markup. */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-[420px] overflow-hidden rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_20px_50px_rgba(30,28,26,0.08)]">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[15px] font-bold">Overview</div>
                <span className="rounded-full border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.5px] text-[var(--color-danger)]">
                  Tournament mode
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { wert: "31", label: "Machines" },
                  { wert: "2", label: "Not playable", ton: true },
                  { wert: "4", label: "Open faults", ton: true },
                  { wert: "3", label: "Service due" },
                  { wert: "1", label: "Appointment" },
                  { wert: "0", label: "Overdue" },
                ].map((k) => (
                  <div
                    key={k.label}
                    className="rounded-[var(--radius)] border border-[var(--color-border)] p-2.5"
                  >
                    <div
                      className={`text-[17px] font-bold leading-none ${
                        k.ton ? "text-[var(--color-danger)]" : ""
                      }`}
                    >
                      {k.wert}
                    </div>
                    <div className="mt-1 text-[10px] leading-tight text-[var(--color-muted)]">
                      {k.label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-[var(--radius)] border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-[11px] text-[var(--color-danger)]">
                Twilight Zone · right flipper weak — reported 4 minutes ago
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== KI ===== */}
      <section className="mx-auto max-w-[1200px] px-5 pb-[70px] sm:px-12">
        <div className="grid grid-cols-1 items-center gap-6 rounded-[10px] border border-[var(--color-accent)]/40 bg-[var(--color-surface-2)] p-9 sm:grid-cols-[auto_1fr] sm:gap-8">
          <div className="w-fit rounded-[4px] border border-[var(--color-accent)]/40 px-2.5 py-[5px] font-mono text-[11px] uppercase tracking-[1px] text-[var(--color-accent)]">
            AI · in use
          </div>
          <div>
            <h3 className="mb-2 text-[18px] font-bold">
              Manual facts and repair suggestions.
            </h3>
            <p className="text-sm leading-[1.65] text-[var(--color-muted)]">
              A PDF manual becomes coil, switch and parts tables for that model,
              plus a generated troubleshooting guide checked against community
              sources by web search. For a reported fault, the model proposes a
              diagnosis, a fix and the parts involved — pre-filled into a repair that a person reviews before saving. A repair that worked can
              be shared — inside your club or publicly — so the next person with
              the same machine does not start over. The source PDF is held in
              memory and never written to storage: only the extracted facts are
              kept, never the copyrighted text.
            </p>
          </div>
        </div>
      </section>

      {/* ===== EHRLICHER STAND ===== */}
      <section className="mx-auto max-w-[1200px] border-t border-[var(--color-border)] px-5 py-[70px] sm:px-12">
        <div className="mb-8 max-w-[620px]">
          <div className={EYEBROW}>Where it actually stands</div>
          <h2 className="mb-3.5 text-[26px] font-bold tracking-[-0.3px] sm:text-[30px]">
            The honest part.
          </h2>
          <p className="text-[15px] leading-[1.65] text-[var(--color-muted)]">
            It is in preview and in real use. Here is where it stands before you
            spend an evening on it — and where it can go.
          </p>
        </div>
        <ul className="max-w-[760px] space-y-3">
          {honest.map((h) => (
            <li
              key={h}
              className="flex gap-3 text-[14px] leading-[1.65] text-[var(--color-muted)]"
            >
              <span
                aria-hidden="true"
                className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[var(--color-accent)]"
              />
              {h}
            </li>
          ))}
        </ul>
      </section>

      {/* ===== ABSCHLUSS ===== */}
      <section className="mx-auto max-w-[1200px] border-t border-[var(--color-border)] px-5 py-[70px] sm:px-12">
        <h2 className="mb-3.5 max-w-[620px] text-[26px] font-bold tracking-[-0.3px] sm:text-[30px]">
          No way in just yet.
        </h2>
        <p className="max-w-[560px] text-[15px] leading-[1.65] text-[var(--color-muted)]">
          There is no sign-up at the moment, and the app is German-only for now.
          So this page is what it is: a look at what the software does. Not an
          invitation — yet.
        </p>
      </section>

      <MarketingFooter />
    </div>
  );
}
