import {
  HandbuchDownload,
  HilfeInhalt,
  HilfeSektionen,
} from "@/components/help-sections";
import { HelpTabs } from "@/components/help-tabs";
import { ANLEITUNG } from "@/lib/help-content";
import { isSuperAdmin, kannKuratieren, requireUser } from "@/lib/session";

/*
  Anleitung / How-To — die benutzerorientierte Hilfe (was kann ich wie tun?).
  Der INHALT lebt in lib/help-content.ts (EINE Quelle für diese Seite, die
  Admin-Hilfe und das PDF-Handbuch unter /help/manual); Darstellung und Icons
  liegen in components/help-sections.tsx. Die entwicklerorientierte
  Architektur-Übersicht liegt unter /help/techstack.
*/
export default async function HelpPage() {
  // Die Tabs „Administration" (Kuratoren/Super-Admins) und „Aufbau & Betrieb"
  // (nur Super-Admins) hängen an den Rollen des Nutzers.
  const user = await requireUser();
  return (
    <div className="space-y-8">
      <HelpTabs
        active="anleitung"
        istSuperAdmin={isSuperAdmin(user)}
        darfKuratieren={kannKuratieren(user)}
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
