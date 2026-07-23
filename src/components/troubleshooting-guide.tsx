import { AlertTriangle, BookOpen, LifeBuoy } from "lucide-react";
import {
  troubleshootingGuideSchema,
  type GuideBlock,
  type GuideSection,
} from "@/lib/validators";

/*
  Anzeige des von Claude erzeugten Troubleshooting-Guides (Phase 3). Wie bei den
  Handbuch-Fakten bewusst eine eigene, themebare Darstellung statt Markdown:
  Abschnitte aus Text-, Warn- und Tabellen-Blöcken. Es wird nur der strukturierte
  Guide gerendert (siehe lib/troubleshooting.ts).
*/

/** Eine stabile Sprungmarke je Abschnitt (aus dem Index, robust gegen Umlaute). */
function sectionId(i: number): string {
  return `guide-abschnitt-${i}`;
}

function TextBlock({ text }: { text: string }) {
  // Absätze am Zeilenumbruch trennen; Leerzeilen ignorieren.
  const absaetze = text.split("\n").filter((z) => z.trim().length > 0);
  return (
    <div className="space-y-2">
      {absaetze.map((z, i) => (
        <p key={i} className="text-sm leading-relaxed text-[var(--color-fg)]">
          {z}
        </p>
      ))}
    </div>
  );
}

function WarnBlock({ text }: { text: string }) {
  return (
    <div className="flex gap-2 rounded-[var(--radius)] border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2.5">
      <AlertTriangle
        size={16}
        className="mt-0.5 flex-none text-[var(--color-danger)]"
      />
      <p className="text-sm leading-relaxed text-[var(--color-fg)]">{text}</p>
    </div>
  );
}

function TableBlock({
  titel,
  spalten,
  zeilen,
}: {
  titel: string;
  spalten: string[];
  zeilen: string[][];
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)]">
      {titel ? (
        <div className="border-b border-[var(--color-border)] px-3 py-2">
          <span className="font-mono text-[11px] uppercase tracking-[1px] text-[var(--color-faint)]">
            {titel}
          </span>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {spalten.length > 0 ? (
            <thead>
              <tr>
                {spalten.map((c, i) => (
                  <th
                    key={i}
                    className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-2 text-left font-semibold text-[var(--color-muted)]"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {zeilen.map((row, r) => (
              <tr key={r} className="odd:bg-[var(--color-overlay)]">
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className="border-b border-[var(--color-border)]/50 px-3 py-2 align-top text-[var(--color-fg)]"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Block({ block }: { block: GuideBlock }) {
  switch (block.typ) {
    case "text":
      return <TextBlock text={block.text} />;
    case "warnung":
      return <WarnBlock text={block.text} />;
    case "tabelle":
      return (
        <TableBlock
          titel={block.titel}
          spalten={block.spalten}
          zeilen={block.zeilen}
        />
      );
  }
}

function Section({ section, index }: { section: GuideSection; index: number }) {
  return (
    <section id={sectionId(index)} className="scroll-mt-24 space-y-3">
      <h3 className="border-b border-[var(--color-border)] pb-1 text-base font-semibold">
        {section.titel}
      </h3>
      <div className="space-y-3">
        {section.bloecke.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>
    </section>
  );
}

export function TroubleshootingGuideView({
  daten,
  model,
  websuche = true,
  createdAt,
}: {
  daten: unknown;
  model: string;
  // Wurde der Guide mit Websuche (Community-Quellen) erstellt? Der lokale
  // Ollama-Pfad kann das nicht — dann ist der Guide weniger verlässlich.
  websuche?: boolean;
  createdAt: Date;
}) {
  // Defensiv parsen: eine gespeicherte, aber ungültige Struktur soll die Seite
  // nicht crashen lassen.
  const res = troubleshootingGuideSchema.safeParse(daten);
  if (!res.success) return null;
  const guide = res.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <LifeBuoy size={16} className="text-[var(--color-primary)]" />
        <span className="text-sm font-medium">Plattform:</span>
        <span className="rounded-full border border-[var(--color-primary)] px-2.5 py-0.5 text-sm text-[var(--color-primary)]">
          {guide.plattform}
        </span>
      </div>

      {/* Ohne Websuche (lokales Modell) prominent kennzeichnen: der Guide stammt
          nur aus dem Modellwissen und ist nicht gegen Community-Quellen geprüft. */}
      {!websuche ? (
        <WarnBlock text="Ohne Websuche erstellt — nur aus dem Modellwissen (lokales Modell). Plattform und bekannte Serienfehler wurden NICHT gegen Community-Quellen (IPDB, PinWiki, Pinside) verifiziert. Vor Arbeiten unbedingt mit Original-Manual und Schaltplan gegenprüfen." />
      ) : null}

      {/* Sprungmarken zu den Abschnitten. */}
      {guide.abschnitte.length > 1 ? (
        <nav
          aria-label="Guide-Abschnitte"
          className="flex flex-wrap gap-2 text-sm"
        >
          {guide.abschnitte.map((a, i) => (
            <a
              key={i}
              href={`#${sectionId(i)}`}
              className="rounded-full border border-[var(--color-border)] px-3 py-0.5 text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-fg)]"
            >
              {a.titel}
            </a>
          ))}
        </nav>
      ) : null}

      {guide.abschnitte.map((section, i) => (
        <Section key={i} section={section} index={i} />
      ))}

      {guide.quellen.length > 0 ? (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 border-b border-[var(--color-border)] pb-1 text-base font-semibold">
            <BookOpen size={15} /> Quellen zum Gegenprüfen
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--color-fg)]">
            {guide.quellen.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-[var(--color-muted)]">
        KI-generiert ({model}
        {websuche ? ", mit Websuche" : ", ohne Websuche"}) am{" "}
        {createdAt.toLocaleDateString("de-DE")}. Ein KI-generierter Leitfaden —
        vor sicherheitsrelevanten Arbeiten mit Original-Manual und Schaltplan
        gegenprüfen.
      </p>
    </div>
  );
}
