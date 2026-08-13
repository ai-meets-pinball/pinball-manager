import {
  Boxes,
  BookOpen,
  Bug,
  CalendarClock,
  ClipboardList,
  Download,
  FileText,
  Hammer,
  History,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Lightbulb,
  Mail,
  MailPlus,
  Monitor,
  Server,
  Share2,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  UserCog,
  Users,
  Wand2,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import type { HilfeSektion } from "@/lib/help-content";

/*
  Darstellung der Hilfe-Sektionen aus lib/help-content.ts — gemeinsames Rezept
  für /help und /help/admin. Icons hängen hier am Sektions-`key` (der Inhalt
  selbst ist React-frei, damit ihn auch der PDF-Generator nutzen kann);
  unbekannte Keys bekommen das Buch als Fallback.
*/

const iconClass = "text-[var(--color-primary)]";

const icons: Record<string, ReactNode> = {
  // Anleitung
  "erste-schritte": <KeyRound size={18} className={iconClass} />,
  uebersicht: <LayoutDashboard size={18} className={iconClass} />,
  "maschinen-liste": <Wrench size={18} className={iconClass} />,
  "maschinen-detail": <Monitor size={18} className={iconClass} />,
  fehler: <TriangleAlert size={18} className={iconClass} />,
  reparaturen: <Hammer size={18} className={iconClass} />,
  wartungsplan: <CalendarClock size={18} className={iconClass} />,
  "clubs-rollen": <Users size={18} className={iconClass} />,
  "maschinen-teilen": <Share2 size={18} className={iconClass} />,
  "handbuch-daten": <FileText size={18} className={iconClass} />,
  "troubleshooting-guide": <LifeBuoy size={18} className={iconClass} />,
  "wissensbasis-modelle": <Boxes size={18} className={iconClass} />,
  "wissen-teilen": <Share2 size={18} className={iconClass} />,
  "eintrag-bearbeiten": <History size={18} className={iconClass} />,
  "konto-profil": <UserCog size={18} className={iconClass} />,
  feedback: <Bug size={18} className={iconClass} />,
  tipps: <Lightbulb size={18} className={iconClass} />,
  // Admin-Hilfe
  "nutzer-rollen": <ShieldCheck size={18} className={iconClass} />,
  "plattform-einladungen": <MailPlus size={18} className={iconClass} />,
  "email-vorlagen": <Mail size={18} className={iconClass} />,
  "clubs-verwalten": <Users size={18} className={iconClass} />,
  "modelle-generationen": <ClipboardList size={18} className={iconClass} />,
  "feedback-verwaltung": <Bug size={18} className={iconClass} />,
  prompts: <Wand2 size={18} className={iconClass} />,
  kuratierung: <ShieldAlert size={18} className={iconClass} />,
  betrieb: <Server size={18} className={iconClass} />,
};

/** Interaktives Inhaltsverzeichnis: springt per Anker zu den Sektionen
    (die Sektionen tragen `id={key}`). */
export function HilfeInhalt({ sektionen }: { sektionen: HilfeSektion[] }) {
  return (
    <Card>
      <p className="mb-2 text-sm font-semibold">Inhalt</p>
      <ol className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {sektionen.map((sektion, i) => (
          <li key={sektion.key}>
            <a
              href={`#${sektion.key}`}
              className="inline-flex items-baseline gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              <span className="font-mono text-xs text-[var(--color-primary)]">
                {i + 1}
              </span>
              {sektion.titel}
            </a>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** Sektionen mit Icon, Einleitung und nummerierten Schritten rendern. */
export function HilfeSektionen({ sektionen }: { sektionen: HilfeSektion[] }) {
  return (
    <>
      {sektionen.map((sektion) => (
        <section
          key={sektion.key}
          id={sektion.key}
          className="scroll-mt-20 space-y-3"
        >
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              {icons[sektion.key] ?? (
                <BookOpen size={18} className={iconClass} />
              )}
              {sektion.titel}
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              {sektion.einleitung}
            </p>
          </div>

          <Card>
            <ol className="space-y-3">
              {sektion.schritte.map((schritt, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--color-inset)] font-mono text-xs text-[var(--color-primary)]">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed">
                    {schritt.titel ? (
                      <span className="font-medium">{schritt.titel}. </span>
                    ) : null}
                    <span className="text-[var(--color-muted)]">
                      {schritt.text}
                    </span>
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </section>
      ))}
    </>
  );
}

/** Download-Link zum PDF-Handbuch (Route /help/manual). */
export function HandbuchDownload() {
  return (
    <a
      href="/help/manual"
      download
      className="inline-flex flex-none items-center gap-1.5 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--color-inset)]"
    >
      <Download size={15} className={iconClass} />
      Handbuch als PDF
    </a>
  );
}
