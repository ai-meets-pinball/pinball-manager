import {
  HandbuchDownload,
  HilfeInhalt,
  HilfeSektionen,
} from "@/components/help-sections";
import { HelpTabs } from "@/components/help-tabs";
import { ANLEITUNG } from "@/lib/help-content";
import { getCurrentUser, isSuperAdmin, kannKuratieren } from "@/lib/session";

/*
  Anleitung / How-To — die benutzerorientierte Hilfe (was kann ich wie tun?).
  Der INHALT lebt in lib/help-content.ts (EINE Quelle für diese Seite, die
  Admin-Hilfe und das PDF-Handbuch unter /help/manual); Darstellung und Icons
  liegen in components/help-sections.tsx. Die entwicklerorientierte
  Architektur-Übersicht liegt unter /help/techstack.
*/
export default async function HelpPage() {
  // Die Anleitung ist ÖFFENTLICH (kein requireUser). Die Tabs „Techstack",
  // „Administration" und „Aufbau & Betrieb" erscheinen nur für Angemeldete
  // bzw. die passende Rolle — Gäste sehen nur die Anleitung.
  const user = await getCurrentUser();
  return (
    <div className="space-y-8">
      <HelpTabs
        active="anleitung"
        istSuperAdmin={isSuperAdmin(user)}
        darfKuratieren={kannKuratieren(user)}
        eingeloggt={Boolean(user)}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Anleitung &amp; How-To</h1>
          <p className="text-[var(--color-muted)]">
            Schritt für Schritt durch alle Funktionen — von der Anmeldung über
            Maschinen, Fehler, Reparaturen und Wartungsplan bis zu Clubs,
            Wissensbasis, Handbuch-Daten, Troubleshooting-Guide und Konto.
          </p>
        </div>
        <HandbuchDownload />
      </div>

      <HilfeInhalt sektionen={ANLEITUNG} />
      <HilfeSektionen sektionen={ANLEITUNG} />
    </div>
  );
}
