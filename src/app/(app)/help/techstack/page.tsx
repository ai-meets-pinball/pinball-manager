import {
  BookOpen,
  Boxes,
  Database,
  KeyRound,
  Layers,
  Palette,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { HelpTabs } from "@/components/help-tabs";
import { Card } from "@/components/ui/card";

/*
  Hilfe-/Techstack-Seite.

  Diese Seite ist bewusst als Lernmaterial gedacht ("KI meets Pinball", PRD §8):
  Sie listet jede eingesetzte Bibliothek, jeden UI-Baustein und jedes
  Architektur-Muster auf — mit "Was ist das?", "Warum hier?" und einem Zeiger
  in den Code. Wer neu dazukommt, kann von hier aus dem Projekt folgen.

  Der Inhalt ist als einfache Daten am Anfang der Datei definiert und darunter
  gerendert — Daten und Darstellung getrennt, damit beides gut lesbar bleibt.
*/

type StackItem = {
  name: string;
  /** npm-Version bzw. Kennzeichnung (z. B. "Muster" für Nicht-Pakete). */
  version?: string;
  /** Was ist das und warum setzen wir es genau hier ein? */
  beschreibung: string;
  /** Wo im Code kann man das nachlesen? (Pfad relativ zum Repo-Wurzelverzeichnis) */
  imCode?: string;
};

type StackSection = {
  titel: string;
  icon: ReactNode;
  einleitung: string;
  items: StackItem[];
};

/* Die Versionsnummern spiegeln package.json wider (Stand Phase 1). */
const sections: StackSection[] = [
  {
    titel: "Framework & Sprache",
    icon: <Layers size={18} className="text-[var(--color-primary)]" />,
    einleitung:
      "Das Grundgerüst: Wie die App gebaut, gerendert und ausgeliefert wird.",
    items: [
      {
        name: "Next.js",
        version: "16.2.9",
        beschreibung:
          "Das React-Framework mit App Router. Seiten sind standardmäßig Server Components (laufen auf dem Server, holen Daten direkt aus der DB). Turbopack ist der Dev-/Build-Bundler. In Next 16 heißt die Edge-Datei nicht mehr middleware, sondern proxy.",
        imCode: "src/app/ (App Router), src/proxy.ts",
      },
      {
        name: "React",
        version: "19.2.4",
        beschreibung:
          "Die UI-Bibliothek. Wir nutzen v19 mit Server Components; Formulare rufen Server Actions auf, statt eigene API-Routen zu bauen.",
        imCode: "alle *.tsx-Komponenten",
      },
      {
        name: "TypeScript",
        version: "5",
        beschreibung:
          "Typsicheres JavaScript. Zieht sich vom DB-Schema (Drizzle) bis in die Komponenten durch, sodass Feldnamen und Typen überall geprüft werden.",
        imCode: "tsconfig.json",
      },
    ],
  },
  {
    titel: "Authentifizierung",
    icon: <KeyRound size={18} className="text-[var(--color-primary)]" />,
    einleitung:
      "Wer bist du? — Anmeldung per E-Mail/Passwort, bewusst als lesbare TS-Konfiguration.",
    items: [
      {
        name: "Better Auth",
        version: "1.6.23",
        beschreibung:
          "Authentifizierung als sichtbare TypeScript-Konfiguration (kein Fremd-Auth-Dienst). Verwaltet Sessions per Cookie; die Session wird in Server Components über die Better-Auth-API ausgelesen.",
        imCode: "src/lib/auth.ts, src/app/api/auth/[...all]/route.ts",
      },
    ],
  },
  {
    titel: "Datenbank & Daten",
    icon: <Database size={18} className="text-[var(--color-primary)]" />,
    einleitung:
      "Wo die Daten liegen und wie wir sie typsicher lesen und schreiben.",
    items: [
      {
        name: "Drizzle ORM",
        version: "0.45.2",
        beschreibung:
          "Typsicheres ORM. Das Schema in TypeScript ist die einzige Quelle der Wahrheit; daraus werden Typen und SQL-Migrationen erzeugt (drizzle-kit). Abfragen sind normale TS-Funktionen — gut lesbar statt versteckt.",
        imCode: "src/db/schema.ts, src/db/queries.ts",
      },
      {
        name: "postgres",
        version: "3.4.9",
        beschreibung:
          "Der Postgres-Treiber, den Drizzle nutzt, um sich mit der Supabase-Datenbank zu verbinden.",
        imCode: "src/db/index.ts",
      },
      {
        name: "Supabase",
        version: "supabase-js 2.109.0",
        beschreibung:
          "Wird BEWUSST nur als Postgres + Datei-Storage verwendet — nicht als Auth- oder API-Ebene. Es gibt absichtlich KEIN Row-Level-Security: die Zugriffsregeln stehen im TypeScript (siehe Architektur unten). Der Storage-Bucket machine-photos hält die Maschinenfotos.",
        imCode: "src/lib/storage.ts (Upload), src/db",
      },
      {
        name: "Zod",
        version: "4.4.3",
        beschreibung:
          "Schema-Validierung. Formulardaten aus Server Actions werden vor dem Speichern gegen ein Zod-Schema geprüft, damit ungültige Eingaben nie die DB erreichen.",
        imCode: "src/lib/validators.ts, src/db/actions/*.ts",
      },
    ],
  },
  {
    titel: "UI & Styling",
    icon: <Palette size={18} className="text-[var(--color-primary)]" />,
    einleitung:
      "Aussehen und Bedienung — mobilfreundlich, helles „editorial\" Theme mit Bordeaux-Akzent (Design-Handoff), plus Dunkelvariante.",
    items: [
      {
        name: "Tailwind CSS",
        version: "4.3.2",
        beschreibung:
          "Utility-CSS in der v4-CSS-first-Variante: Die Design-Tokens (Farben, Schriften, Radius) stehen als CSS-Variablen in globals.css und werden überall als var(--color-...) genutzt — die .dark-Klasse überschreibt sie für den Dunkelmodus.",
        imCode: "src/app/globals.css",
      },
      {
        name: "Lucide React",
        version: "1.22.0",
        beschreibung:
          "Die Icon-Bibliothek (z. B. Wrench, Users). Icons sind React-Komponenten mit size-/className-Props.",
        imCode: "Importe in *.tsx (z. B. src/components/nav.tsx)",
      },
      {
        name: "next-themes",
        version: "0.4.6",
        beschreibung:
          "Steuert Hell/Dunkel über die .dark-Klasse am <html>. defaultTheme=\"light\"; der ThemeToggle in der Nav schaltet um.",
        imCode: "src/components/theme-provider.tsx, src/app/layout.tsx",
      },
    ],
  },
  {
    titel: "UI-Bausteine (eigene Komponenten)",
    icon: <Boxes size={18} className="text-[var(--color-primary)]" />,
    einleitung:
      "Kleine, wiederverwendbare Bausteine, aus denen die Seiten zusammengesetzt sind.",
    items: [
      {
        name: "Card",
        version: "Baustein",
        beschreibung:
          "Ein umrahmter Container mit Standard-Radius und Oberflächenfarbe. Grundlage fast jeder Listen- und Detailansicht.",
        imCode: "src/components/ui/card.tsx",
      },
      {
        name: "Button / Input",
        version: "Baustein",
        beschreibung:
          "Einheitlich gestylte Schaltflächen und Eingabefelder, damit alle Formulare gleich aussehen und sich gleich anfühlen.",
        imCode: "src/components/ui/button.tsx, input.tsx",
      },
      {
        name: "StatusBadge",
        version: "Baustein",
        beschreibung:
          "Farbige Plakette für Zustände (z. B. Fehlerstatus offen/behoben, Club-Rolle). Kapselt die Zuordnung Wert → Farbe an einer Stelle.",
        imCode: "src/components/ui/status-badge.tsx",
      },
      {
        name: "Formulare & Listen",
        version: "Baustein",
        beschreibung:
          "Fachliche Bausteine wie machine-form, fault-list, repair-form. Sie verbinden die UI-Bausteine oben mit den Server Actions.",
        imCode: "src/components/*.tsx",
      },
    ],
  },
  {
    titel: "Architektur-Muster",
    icon: <ShieldCheck size={18} className="text-[var(--color-primary)]" />,
    einleitung:
      "Die bewussten Entscheidungen, die das Projekt zusammenhalten (PRD §3, §7).",
    items: [
      {
        name: "Autorisierung in der App-Schicht",
        version: "Muster",
        beschreibung:
          "Jeder Datenzugriff läuft durch die require*-Helfer. Die eine Regel „Eigentümer ODER Club-Mitglied“ steht sichtbar im TypeScript — kein verstecktes Row-Level-Security in der DB. Fehler und Reparaturen erben ihre Rechte über die Maschine.",
        imCode: "src/lib/session.ts",
      },
      {
        name: "Server Actions",
        version: "Muster",
        beschreibung:
          "Schreibende Operationen (anlegen/ändern/löschen) sind Server-Funktionen, die Formulare direkt aufrufen — validiert per Zod, autorisiert per require*. Keine separate REST-API nötig.",
        imCode: "src/db/actions/*.ts",
      },
      {
        name: "Proxy als optimistischer Check",
        version: "Muster",
        beschreibung:
          "Der Next-16-Proxy leitet Unangemeldete nur früh weg (Cookie vorhanden?). Er ist NICHT die Sicherheitsgrenze — die echte Prüfung machen die require*-Helfer.",
        imCode: "src/proxy.ts",
      },
      {
        name: "Fehler ≠ Reparatur",
        version: "Muster",
        beschreibung:
          "Ein Fehler (fault) kann ohne Reparatur existieren; das Symptom lebt am Fehler. Eine Reparatur kann Fehler beheben und setzt deren Status auf „behoben“. Zwei getrennte Konzepte (PRD §4).",
        imCode: "src/db/schema.ts (faults, repairs)",
      },
      {
        name: "Handbuch-Pipeline (Copyright)",
        version: "Muster · Phase 2",
        beschreibung:
          "Eigenes Handbuch-PDF hochladen → Claude (claude-sonnet-5, @anthropic-ai/sdk) extrahiert nur Faktentabellen → in machine_data gespeichert. Der Schutz ist die Pipeline: Attestation Pflicht, das PDF bleibt nur im Speicher und wird NIE gespeichert, nur die Fakten landen in der DB.",
        imCode: "src/lib/manual-extract.ts, src/components/machine-data-tables.tsx",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <HelpTabs active="techstack" />
      <div className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <BookOpen size={22} className="text-[var(--color-primary)]" />
          Techstack &amp; Architektur
        </h1>
        <p className="text-[var(--color-muted)]">
          Ein Überblick über alle Bibliotheken, Bausteine und Muster dieses
          Projekts — mit einem Zeiger in den Code. Gedacht als Einstieg für alle,
          die dem Aufbau folgen möchten.
        </p>
      </div>

      {sections.map((section) => (
        <section key={section.titel} className="space-y-3">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              {section.icon}
              {section.titel}
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              {section.einleitung}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {section.items.map((item) => (
              <Card key={item.name} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{item.name}</span>
                  {item.version && (
                    <span className="rounded-[var(--radius)] bg-[var(--color-border)]/50 px-2 py-0.5 font-mono text-xs text-[var(--color-muted)]">
                      {item.version}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--color-muted)]">
                  {item.beschreibung}
                </p>
                {item.imCode && (
                  <p className="font-mono text-xs text-[var(--color-muted)]">
                    → {item.imCode}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
