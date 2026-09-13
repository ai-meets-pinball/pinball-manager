import {
  KI_FREE_HINWEIS,
  KI_MODELLE,
  KI_MODELLE_STAND,
  KI_SCHRITTE,
  KI_UNGEEIGNET,
  KI_WARUM,
} from "@/lib/ki-hinweise";

/*
  Der Prompt-Weg, erklärt: Warum es ihn gibt, wie er genau geht, welche Modelle
  taugen und warum kostenlose Konten enttäuschen. Die Worte kommen aus
  lib/ki-hinweise.ts (eine Quelle für Dialoge und Hilfe). Aufklappbar per
  <details>, damit der Import-Dialog kompakt bleibt — der erste Satz steht
  immer da.
*/
export function PromptWeg({ weg }: { weg: "handbuch" | "guide" }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="text-[var(--color-muted)]">
        Der Weg für alle: Prompt kopieren, im eigenen KI-Abo ausführen, das
        JSON hier einfügen. Die App verarbeitet dabei nichts per KI — die
        Prüfung unten sagt dir, ob das Ergebnis gut genug ist. Manchmal reicht
        ein kostenloses Konto nicht: dann braucht es ein leistungsfähigeres
        Modell und eine höhere Reasoning-Stufe — bei Claude etwa Sonnet 5 statt Haiku
        mit „high“ statt „normal“; bei OpenAI, Google und anderen gilt das
        Gleiche.
      </p>
      <details className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
        <summary className="cursor-pointer font-medium">
          Warum so, wie genau, und mit welchem Modell?
        </summary>
        <div className="mt-2 space-y-3 text-[var(--color-muted)]">
          <p>{KI_WARUM}</p>
          <div>
            <p className="font-medium text-[var(--color-fg)]">So geht es</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5">
              {KI_SCHRITTE[weg].map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
          <div>
            <p className="font-medium text-[var(--color-fg)]">
              Geeignete Modelle (Stand {KI_MODELLE_STAND})
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {KI_MODELLE.map((m) => (
                <li key={m.name}>
                  <span className="text-[var(--color-fg)]">{m.name}</span> — {m.hinweis}
                </li>
              ))}
            </ul>
            <p className="mt-1">{KI_UNGEEIGNET}</p>
          </div>
          <p className="rounded-[var(--radius)] border border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 px-2 py-1.5 text-[var(--color-warn)]">
            {KI_FREE_HINWEIS}
          </p>
        </div>
      </details>
    </div>
  );
}
