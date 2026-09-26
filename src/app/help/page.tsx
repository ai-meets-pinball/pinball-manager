import Link from "next/link";
import {
  HandbuchDownload,
  HilfeInhalt,
  HilfeSektionen,
} from "@/components/help-sections";
import { HelpTabs } from "@/components/help-tabs";
import { SearchToolbar } from "@/components/ui/search-toolbar";
import { ADMIN_HILFE, ANLEITUNG, EINSTIEG } from "@/lib/help-content";
import { filtereHilfe } from "@/lib/hilfe-suche";
import { getCurrentUser, isSuperAdmin, kannKuratieren } from "@/lib/session";

/*
  Anleitung / How-To — die benutzerorientierte Hilfe (was kann ich wie tun?).
  Der INHALT lebt in lib/help-content.ts (EINE Quelle für diese Seite, die
  Admin-Hilfe und das PDF-Handbuch unter /help/manual); Darstellung und Icons
  liegen in components/help-sections.tsx. Die entwicklerorientierte
  Architektur-Übersicht liegt unter /help/techstack.
*/
export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // Die Anleitung ist ÖFFENTLICH (kein requireUser). Die Tabs „Techstack",
  // „Administration" und „Aufbau & Betrieb" erscheinen nur für Angemeldete
  // bzw. die passende Rolle — Gäste sehen nur die Anleitung.
  const [user, { q }] = await Promise.all([getCurrentUser(), searchParams]);
  const suche = (q ?? "").trim();

  // Suche (URL-Parameter q, GET-Formular ohne JS): filtert die Anleitung und
  // zeigt Treffer aus den anderen Hilfe-Seiten als Links — Einstieg für alle,
  // die Admin-Hilfe nur für die, die den Tab auch sehen (und nurSuperAdmin-
  // Sektionen nur für Super-Admins). Die Regel liegt in lib/hilfe-suche.ts.
  const sektionen = filtereHilfe(ANLEITUNG, suche);
  const einstiegTreffer = suche ? filtereHilfe(EINSTIEG, suche) : [];
  const adminTreffer =
    suche && kannKuratieren(user)
      ? filtereHilfe(
          ADMIN_HILFE.filter((s) => !s.nurSuperAdmin || isSuperAdmin(user)),
          suche,
        )
      : [];
  const anderswo = [
    ...einstiegTreffer.map((s) => ({
      key: `einstieg-${s.key}`,
      label: `Einstieg: ${s.titel}`,
      href: `/help/einstieg${s.zielgruppe ? `?ich=${s.zielgruppe}` : ""}#${s.key}`,
    })),
    ...adminTreffer.map((s) => ({
      key: `admin-${s.key}`,
      label: `Administration: ${s.titel}`,
      href: `/help/admin#${s.key}`,
    })),
  ];

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
            Wissensbasis, Handbuch-Daten, Troubleshooting-Guide und Konto. Neu
            hier? Der{" "}
            <Link href="/help/einstieg" className="text-[var(--color-primary)] hover:underline">
              Einstieg
            </Link>{" "}
            ist der kurze Weg hinein.
          </p>
        </div>
        <HandbuchDownload />
      </div>

      <SearchToolbar
        action="/help"
        placeholder="In der Hilfe suchen …"
        label="In der Hilfe suchen"
        defaultValue={suche}
        resetHref="/help"
        ohneButton
      />

      {suche && sektionen.length === 0 && anderswo.length === 0 ? (
        <p className="text-[var(--color-muted)]">
          Nichts gefunden zu „{suche}“.
        </p>
      ) : null}

      {anderswo.length > 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          Auch gefunden in:{" "}
          {anderswo.map((t, i) => (
            <span key={t.key}>
              {i > 0 ? " · " : null}
              <Link
                href={t.href}
                className="text-[var(--color-primary)] hover:underline"
              >
                {t.label}
              </Link>
            </span>
          ))}
        </p>
      ) : null}

      {sektionen.length > 0 ? (
        <>
          <HilfeInhalt sektionen={sektionen} />
          <HilfeSektionen sektionen={sektionen} />
        </>
      ) : null}
    </div>
  );
}
