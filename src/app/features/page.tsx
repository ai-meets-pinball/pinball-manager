import Link from "next/link";
import { MarketingFooter, MarketingNav } from "@/components/site-chrome";
import { baseUrl, erzeugeQrSvgFuerUrl } from "@/lib/qr-code";

/*
  Öffentliche Funktionen-Seite — editorial Rebrand (Handoff v2). Texte wie im
  Design; die Reihenfolge spiegelt den Kern der Anwendung (Verwaltung zuerst).
*/

const deepFeatures = [
  {
    tag: "Inventar & Stammdaten", roadmap: false,
    title: "Stammdaten je Maschine — aus dem Katalog.",
    desc: "Modell aus über 2.200 Katalogeinträgen wählen: Hersteller, Baujahr und Foto kommen automatisch mit. Dazu eigene Fotos, Notizen, Links und Dateien je Gerät.",
    points: ["Modell aus dem Katalog, Foto inklusive", "Eigene Fotos, Notizen und Dokumente je Gerät", "Betriebsstatus und offene Fehler auf einen Blick"],
  },
  {
    tag: "Verein & Mitglieder", roadmap: false,
    title: "Gemeinsamer Bestand für Verein oder Location.",
    desc: "Mitglieder sehen den vollständigen Maschinenbestand inklusive Eigentümer und Betriebsstatus. Rollen regeln, wer eintragen, reparieren oder nur melden darf.",
    points: ["Rollen: Owner, Admin, Mitglied", "Bestandsübersicht mit Eigentümerzuordnung", "Fällige Wartungen aller Maschinen im Überblick"],
  },
  {
    tag: "Fehler & Reparaturen", roadmap: false,
    title: "Reparatur-Historie je Maschine.",
    desc: "Jede Reparatur wird mit Datum, Ursache, verwendeten Teilen und Kosten protokolliert und ist durchsuchbar.",
    points: ["Teile- und Kostenerfassung", "Durchsuchbare Historie", "Fotos an jeder Fehlermeldung"],
  },
  {
    tag: "Handbuch-Daten per KI", roadmap: false,
    title: "Handbücher werden zu Referenztabellen.",
    desc: "Ein PDF-Handbuch wird per KI in durchsuchbare Tabellen umgewandelt — Spulen, Schalter, Lampen, Sicherungen, Teile, Regeln, Schrauben, Gummi, Elektronik. Das PDF wird dabei nicht gespeichert, nur die Fakten.",
    points: ["PDF per KI auswerten oder JSON importieren", "Troubleshooting-Guides je Modell", "Wissen privat, im Club oder öffentlich teilen"],
  },
  {
    tag: "Betrieb & Wartung", roadmap: false,
    title: "Was spielbereit ist — und was ansteht.",
    desc: "Jede Maschine trägt einen Betriebsstatus (automatisch aus offenen Fehlern oder manuell gesetzt), dazu Wartungspläne mit Fälligkeiten und Erinnerungen.",
    points: ["Status: spielbereit / eingeschränkt / außer Betrieb", "Wartungsplan mit Fälligkeiten und Erinnerungen", "Überblick über nicht spielbereite Geräte"],
  },
  {
    tag: "KI-Diagnose", roadmap: true,
    title: "Diagnose-Unterstützung.",
    desc: "Erste KI-Reparaturvorschläge zu einem gemeldeten Fehler gibt es bereits (Diagnose, Maßnahme, Teile) — aus dem vorhandenen Maschinen-Wissen. Als Nächstes: Bauteil-Erkennung per Foto.",
    points: ["Reparaturvorschlag aus Symptom + Wissen", "Bild-Erkennung von Bauteilen (in Arbeit)", "Verweise auf passende Ersatzteile"],
  },
];

export default async function FeaturesPage() {
  const qrBeispiel = await erzeugeQrSvgFuerUrl(baseUrl());
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

        {/* Highlight: Fehler melden per QR — der neue Melde-Vorgang am Gerät. */}
        <section className="mb-4 grid grid-cols-1 items-center gap-8 rounded-[12px] border border-[var(--color-accent)]/40 bg-[var(--color-surface-2)] p-7 sm:p-9 md:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="mb-3 font-mono text-xs uppercase tracking-[1px] text-[var(--color-accent)]">
              Neu · Fehler melden per QR
            </div>
            <h2 className="mb-3.5 text-[24px] font-bold leading-[1.25] sm:text-[27px]">
              Ein Scan am Gerät — und der Fehler ist gemeldet.
            </h2>
            <p className="mb-5 text-[14px] leading-[1.7] text-[var(--color-muted)]">
              Jede Maschine bekommt ein QR-Etikett. Wer den Code scannt, landet auf
              einer öffentlichen Melde-Seite — auch ohne Konto. Symptom beschreiben,
              Namen angeben, fertig. Priorität und Status vergibt der Betreiber.
            </p>
            <ol className="flex flex-col gap-2.5">
              {[
                ["01 · Scannen", "QR-Etikett am Gerät scannen."],
                ["02 · Melden", "Symptom + Name — Login optional."],
                ["03 · Triage", "Der Betreiber priorisiert und behebt."],
              ].map(([k, v]) => (
                <li key={k} className="flex gap-3 text-[13px]">
                  <span className="whitespace-nowrap font-mono text-[11px] font-bold text-[var(--color-accent)]">
                    {k}
                  </span>
                  <span className="text-[var(--color-muted)]">{v}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-[13px] leading-[1.7] text-[var(--color-muted)]">
              Kein Etikett je Gerät nötig: Ein{" "}
              <span className="font-medium text-[var(--color-fg)]">Sammel-QR</span>{" "}
              für einen Club oder deine private Sammlung zeigt zuerst eine
              Geräteauswahl — solche Meldungen sind klar als „aus der Liste
              gewählt" gekennzeichnet. Auf die Etiketten kommt dein Vereins- oder
              persönliches Logo.
            </p>
          </div>
          <div className="flex justify-center">
            <div className="flex w-[220px] max-w-full flex-col items-center gap-3 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <div
                className="aspect-square w-40 rounded-lg bg-white p-3 [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qrBeispiel }}
              />
              <div className="text-center">
                <div className="text-sm font-bold">Godzilla (Pro)</div>
                <div className="font-mono text-[11px] uppercase tracking-[0.5px] text-[var(--color-faint)]">
                  Fehler melden
                </div>
              </div>
              <p className="text-center font-mono text-[10px] leading-[1.5] text-[var(--color-faint)]">
                Beispiel — führt zur Startseite.
              </p>
            </div>
          </div>
        </section>

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
            Der Funktionsumfang wächst mit den Leuten, die Pinball Manager
            nutzen. Ideen oder Wünsche? Wir freuen uns über deine Nachricht.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/preview"
              className="inline-block rounded-[var(--radius)] bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-primary-fg)] transition-colors hover:bg-[var(--color-accent)]"
            >
              Einladung anfragen
            </Link>
            <a
              href="mailto:frg@silverballmania.com?subject=Idee%20f%C3%BCr%20Pinball%20Manager"
              className="inline-block rounded-[var(--radius)] border border-[var(--color-border)] px-6 py-3 text-sm font-medium transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Kontaktiere uns
            </a>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
