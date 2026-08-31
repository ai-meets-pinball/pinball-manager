import { MarketingFooter, MarketingNav } from "@/components/site-chrome";

/*
  Datenschutzerklärung (DSGVO). Solider Entwurf — KEINE Rechtsberatung; vor dem
  öffentlichen Onboarding gegenlesen/prüfen lassen. Platzhalter [ … ] (v. a.
  Verantwortlicher + zuständige Aufsichtsbehörde) mit echten Angaben füllen.
*/
export const metadata = { title: "Datenschutzerklärung · Pinball Manager" };

const H2 = "mb-2 mt-8 text-lg font-semibold text-[var(--color-fg)]";
const A = "text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80";

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen">
      <MarketingNav />

      <main className="mx-auto max-w-[760px] px-5 pb-28 pt-[70px] sm:px-12">
        <h1 className="mb-6 text-[28px] font-bold tracking-[-0.3px] sm:text-[34px]">
          Datenschutzerklärung
        </h1>

        <div className="text-[15px] leading-[1.7] text-[var(--color-muted)]">
          <p>
            Pinball Manager ist eine Anwendung zur Verwaltung von
            Flipperautomaten (Maschinen, Fehler, Reparaturen, Wartung). Der
            Schutz deiner Daten ist uns wichtig. Nachfolgend informieren wir über
            die Verarbeitung personenbezogener Daten.
          </p>

          <h2 className="mt-8 mb-2 text-lg font-semibold text-[var(--color-fg)]">
            1. Verantwortlicher
          </h2>
          <p>
            [Vor- und Nachname]
            <br />
            [Straße und Hausnummer], [PLZ und Ort], Deutschland
            <br />
            E-Mail:{" "}
            <a href="mailto:kontakt@pinball-manager.app" className={A}>
              kontakt@pinball-manager.app
            </a>{" "}
            (siehe auch <a href="/impressum" className={A}>Impressum</a>).
          </p>

          <h2 className={H2}>2. Welche Daten wir verarbeiten</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Kontodaten:</strong> Name, E-Mail-Adresse, Passwort (nur als
              Hash gespeichert), optional Profilbild.
            </li>
            <li>
              <strong>Inhaltsdaten:</strong> die von dir erfassten Maschinen,
              Fehler, Reparaturen, Wartungspläne, Termine, Dokumente, Notizen,
              Fotos sowie Club-/Mitgliedschaftsangaben und Besitzerkontakte.
            </li>
            <li>
              <strong>Optionale WhatsApp-Benachrichtigung:</strong> sofern
              aktiviert, deine Telefonnummer zur Zustellung von Fehler-Meldungen.
            </li>
            <li>
              <strong>Feedback:</strong> von dir gemeldete Fehler/Ideen inkl.
              optionalem Screenshot und technischem Kontext (Seite, Version,
              Browser).
            </li>
            <li>
              <strong>Server-Logdaten:</strong> beim Aufruf technisch anfallende
              Daten (u. a. IP-Adresse, Zeitpunkt, angefragte Ressource) durch
              unseren Hosting-Dienstleister.
            </li>
          </ul>

          <h2 className={H2}>3. Zwecke &amp; Rechtsgrundlagen</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Bereitstellung von Konto und Funktionen (Erfassen/Verwalten deiner
              Daten, Teilen im Club) —{" "}
              <strong>Art. 6 Abs. 1 lit. b DSGVO</strong> (Nutzungsverhältnis).
            </li>
            <li>
              Betrieb, Sicherheit und Stabilität (Logs, Missbrauchsabwehr) —{" "}
              <strong>Art. 6 Abs. 1 lit. f DSGVO</strong> (berechtigtes Interesse).
            </li>
            <li>
              E-Mail-Zustellung (Einladung, Passwort-Reset, Benachrichtigungen) —{" "}
              <strong>lit. b/f</strong>.
            </li>
            <li>
              WhatsApp-Benachrichtigung und KI-Auswertungen: nur auf deine
              ausdrückliche Aktivierung/Auslösung hin —{" "}
              <strong>Art. 6 Abs. 1 lit. a/f DSGVO</strong>.
            </li>
          </ul>

          <h2 className={H2}>4. Empfänger / Auftragsverarbeiter</h2>
          <p>
            Wir setzen sorgfältig ausgewählte Dienstleister als Auftragsverarbeiter
            (Art. 28 DSGVO) ein:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Supabase</strong> — Datenbank &amp; Datei-Speicher; die Daten
              liegen in einem Rechenzentrum in der <strong>EU (Frankfurt)</strong>.
            </li>
            <li>
              <strong>Vercel</strong> — Hosting/Auslieferung der Anwendung (USA).
            </li>
            <li>
              <strong>Resend</strong> — Versand transaktionaler E-Mails (USA).
            </li>
            <li>
              <strong>Anthropic (Claude)</strong> — nur wenn du eine KI-Funktion
              auslöst (z. B. Handbuch-Auswertung); dann werden die dafür nötigen
              Inhalte übermittelt (USA). Optional mit eigenem API-Schlüssel.
            </li>
          </ul>
          <p className="mt-2">
            Bei Dienstleistern in den USA erfolgt die Übermittlung auf Grundlage
            geeigneter Garantien (EU-Standardvertragsklauseln bzw. EU-US Data
            Privacy Framework).
          </p>

          <h2 className={H2}>5. Cookies</h2>
          <p>
            Wir verwenden ausschließlich ein <strong>technisch notwendiges</strong>{" "}
            Sitzungs-Cookie zur Anmeldung (Login). Es findet{" "}
            <strong>kein Tracking</strong> und keine Reichweiten-/Werbeanalyse
            statt; deshalb ist kein Cookie-Banner erforderlich (§ 25 Abs. 2 TDDDG).
          </p>

          <h2 className={H2}>6. Speicherdauer</h2>
          <p>
            Konto- und Inhaltsdaten speichern wir, solange dein Konto besteht.
            Löschst du dein Konto (siehe unten), werden deine personenbezogenen
            Daten gelöscht bzw. anonymisiert; in Clubs geteilte Inhalte bleiben dem
            Club erhalten. Server-Logs werden nur kurzzeitig vorgehalten.
          </p>

          <h2 className={H2}>7. Deine Rechte</h2>
          <p>
            Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung
            der Verarbeitung, Datenübertragbarkeit sowie Widerspruch; erteilte
            Einwilligungen kannst du jederzeit mit Wirkung für die Zukunft
            widerrufen.
          </p>
          <p className="mt-2">
            <strong>Konto &amp; Daten löschen:</strong> Angemeldet unter{" "}
            <a href="/account" className={A}>Konto</a> → „Konto löschen" kannst du
            dein Konto samt zugehöriger Daten selbst und unwiderruflich löschen.
            Alternativ genügt eine formlose E-Mail an uns.
          </p>
          <p className="mt-2">
            Zudem besteht ein Beschwerderecht bei einer Datenschutz-Aufsichts­behörde,
            insbesondere der für uns zuständigen: [zuständige Aufsichtsbehörde].
          </p>

          <h2 className={H2}>8. Änderungen</h2>
          <p>
            Wir passen diese Erklärung an, wenn sich die Anwendung oder die
            Rechtslage ändert. Es gilt die jeweils hier veröffentlichte Fassung.
          </p>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
