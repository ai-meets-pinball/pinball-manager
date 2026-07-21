import {
  FileText,
  Hammer,
  KeyRound,
  LifeBuoy,
  Lightbulb,
  Share2,
  ShieldCheck,
  TriangleAlert,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";
import { HelpTabs } from "@/components/help-tabs";
import { Card } from "@/components/ui/card";
import { isSuperAdmin, requireUser } from "@/lib/session";

/*
  Anleitung / How-To — die benutzerorientierte Hilfe (was kann ich wie tun?).
  Bewusst als Daten am Dateianfang definiert und darunter gerendert, damit Inhalt
  und Darstellung getrennt bleiben (wie die Techstack-Seite). Die entwickler-
  orientierte Architektur-Übersicht liegt unter /help/techstack.
*/

type Step = { titel?: string; text: string };
type GuideSection = {
  titel: string;
  icon: ReactNode;
  einleitung: string;
  steps: Step[];
};

const sections: GuideSection[] = [
  {
    titel: "Erste Schritte",
    icon: <KeyRound size={18} className="text-[var(--color-primary)]" />,
    einleitung:
      "Konto anlegen (nur mit Einladung), anmelden, Passwort zurücksetzen.",
    steps: [
      {
        titel: "Konto anlegen — nur mit Einladung",
        text: "Eine Registrierung ist ausschließlich über einen Einladungslink möglich. Den bekommst du per E-Mail: entweder als Club-Einladung oder als allgemeine Einladung von einem Super-Admin. Über den Link gibst du Name, E-Mail und Passwort ein — mindestens 8 Zeichen mit Groß- und Kleinbuchstaben sowie einer Zahl, dazu die Wiederholung. Mit dem Augen-Symbol lässt sich das Passwort anzeigen oder verbergen.",
      },
      {
        titel: "Anmelden",
        text: "Danach mit E-Mail und Passwort anmelden. Passwort vergessen? Der Link auf der Anmeldeseite schickt dir eine E-Mail zum Zurücksetzen.",
      },
      {
        titel: "Per Einladung beitreten",
        text: "Wurdest du eingeladen, öffne den Link aus der E-Mail. Hast du noch kein Konto, registrierst du dich direkt darüber und trittst dem Club automatisch bei.",
      },
      {
        titel: "Wo finde ich was?",
        text: "Oben links liegen Maschinen und Hilfe. Hinter dem Nutzer-Icon oben rechts findest du Clubs, Konto, Administration (nur Super-Admins) und Abmelden. Daneben schaltest du zwischen hellem und dunklem Design um.",
      },
    ],
  },
  {
    titel: "Maschinen",
    icon: <Wrench size={18} className="text-[var(--color-primary)]" />,
    einleitung: "Deine Automaten anlegen, pflegen und verwalten.",
    steps: [
      {
        titel: "Anlegen",
        text: "Maschinen → »Neue Maschine«. Über die OPDB-Suche lassen sich Hersteller, Modell, Baujahr und ein Foto automatisch übernehmen — oder du füllst alles von Hand aus. Ein eigenes Foto kannst du zusätzlich hochladen. Tipp: Die OPDB-Auswahl verknüpft die Maschine mit dem Gerätetyp — nur damit lassen sich später Handbuch-Daten und Reparaturen teilen.",
      },
      {
        titel: "Ansehen & bearbeiten",
        text: "Auf eine Maschinenkachel klicken öffnet die Detailseite. Über »Bearbeiten« änderst du Daten, Foto oder die Club-Zuordnung.",
      },
      {
        titel: "Private Sammlung",
        text: "Ohne Club-Zuordnung gehört eine Maschine nur dir und ist auch nur für dich sichtbar.",
      },
      {
        titel: "Löschen",
        text: "Auf der Detailseite über »Löschen«. Das dürfen nur der Eigentümer, ein Club-Owner/-Admin oder ein Super-Admin.",
      },
    ],
  },
  {
    titel: "Fehler erfassen",
    icon: <TriangleAlert size={18} className="text-[var(--color-primary)]" />,
    einleitung:
      "Ein Fehler ist das Symptom an einer Maschine — er kann auch ganz ohne Reparatur bestehen.",
    steps: [
      {
        titel: "Melden",
        text: "Auf der Maschinen-Detailseite »Neuer Fehler«. Beschreibe das Symptom und wähle optional eine Kategorie (z. B. Spule, Schalter), eine Priorität (niedrig/mittel/hoch) und den Status.",
      },
      {
        titel: "Status & Filter",
        text: "Der Status durchläuft offen → in Arbeit → behoben. Über die Chips oben lässt sich die Fehlerliste nach Status filtern.",
      },
      {
        titel: "Gut zu wissen",
        text: "Das Symptom lebt am Fehler und wird nie an die Reparatur dupliziert — Fehler und Reparatur sind bewusst getrennt.",
      },
    ],
  },
  {
    titel: "Reparaturen",
    icon: <Hammer size={18} className="text-[var(--color-primary)]" />,
    einleitung: "Was wurde gemacht — mit optionaler Verknüpfung zum Fehler.",
    steps: [
      {
        titel: "Erfassen",
        text: "Auf der Maschinen-Detailseite »Neue Reparatur«. Trage Diagnose, Maßnahme, verbaute Teile, Kosten und Zeitaufwand ein.",
      },
      {
        titel: "Mit einem Fehler verknüpfen",
        text: "Optional einen Fehler auswählen. Behebt die Reparatur den Fehler, wird dessen Status automatisch auf »behoben« gesetzt.",
      },
      {
        titel: "Historie",
        text: "Alle Reparaturen einer Maschine stehen chronologisch auf ihrer Detailseite.",
      },
    ],
  },
  {
    titel: "Clubs & Rollen",
    icon: <Users size={18} className="text-[var(--color-primary)]" />,
    einleitung:
      "Clubs teilen Maschinen mit mehreren Mitgliedern. Du kannst in mehreren Clubs sein und behältst dabei deine private Sammlung.",
    steps: [
      {
        titel: "Club erstellen",
        text: "Nutzer-Icon → Clubs → »Neuer Club«. Als Ersteller wirst du automatisch Owner.",
      },
      {
        titel: "Mitglieder einladen",
        text: "Auf der Club-Seite (als Owner oder Admin) eine E-Mail eingeben, Rolle wählen und »Einladen«. Der Empfänger bekommt eine E-Mail mit Beitritts-Link. Offene Einladungen kannst du jederzeit zurückziehen.",
      },
      {
        titel: "Rollen",
        text: "Owner: volle Kontrolle — Mitglieder & Einladungen verwalten, zum Owner befördern, Club löschen. Admin: Mitglieder & Einladungen verwalten, aber nicht zum Owner befördern oder den Club löschen. Mitglied: sieht und pflegt die Club-Maschinen. Das Info-Icon neben »Mitglieder« zeigt die Erklärung jederzeit direkt im Club.",
      },
      {
        titel: "Rolle ändern",
        text: "Als Owner oder Admin wählst du in der Mitgliederliste eine andere Rolle aus und speicherst. Die Owner-Rolle kann nur ein Owner vergeben oder entziehen.",
      },
      {
        titel: "Owner-Regel",
        text: "Ein Club braucht immer mindestens einen Owner. Der letzte Owner kann sich nicht degradieren oder austreten, ohne vorher jemanden zum Owner zu befördern.",
      },
      {
        titel: "Verlassen",
        text: "Über »Verlassen« in der Mitgliederliste trittst du selbst aus einem Club aus.",
      },
    ],
  },
  {
    titel: "Maschinen im Club teilen",
    icon: <Share2 size={18} className="text-[var(--color-primary)]" />,
    einleitung: "So werden Automaten für ein ganzes Team sichtbar.",
    steps: [
      {
        titel: "Zuordnen",
        text: "Maschine »Bearbeiten« → einen Club auswählen. Danach sehen alle Club-Mitglieder die Maschine samt ihren Fehlern und Reparaturen.",
      },
      {
        titel: "Sichtbarkeit",
        text: "Du siehst deine eigenen Maschinen plus die aller Clubs, in denen du Mitglied bist.",
      },
      {
        titel: "Beim Löschen eines Clubs",
        text: "Die Maschinen werden nicht gelöscht, sondern nur vom Club gelöst — sie bleiben beim Eigentümer.",
      },
    ],
  },
  {
    titel: "Handbuch-Daten",
    icon: <FileText size={18} className="text-[var(--color-primary)]" />,
    einleitung:
      "Aus deinem eigenen Handbuch technische Referenztabellen gewinnen — ohne Copyright-Verletzung.",
    steps: [
      {
        titel: "Hochladen",
        text: "Auf der Maschinen-Detailseite im Abschnitt »Handbuch-Daten« bestätigst du, dass du das Handbuch besitzt bzw. die Rechte hast, wählst das PDF und startest die Auswertung.",
      },
      {
        titel: "Was passiert",
        text: "Claude liest das PDF und extrahiert ausschließlich Faktentabellen (Spulen, Schalter-/Lampen-Matrix, Sicherungen, Teile, Regeln). Das PDF wird dabei NIE gespeichert — nur die Fakten landen in der Datenbank.",
      },
      {
        titel: "Ansehen",
        text: "Switch- und Lampen-Matrix erscheinen als farbcodiertes Raster (WPC-Draht-Farbcodes, Opto-Schalter markiert). Über die Kennzahl-Karten springst du zu den Abschnitten; Tabellen mit einer Typ-Spalte lassen sich filtern.",
      },
    ],
  },
  {
    titel: "Troubleshooting-Guide",
    icon: <LifeBuoy size={18} className="text-[var(--color-primary)]" />,
    einleitung:
      "Ein KI-erzeugter FAQ- und Reparatur-Leitfaden für genau dein Modell — verfügbar, sobald Handbuch-Daten vorliegen.",
    steps: [
      {
        titel: "Voraussetzung",
        text: "Der Guide erscheint auf der Maschinen-Detailseite, sobald für die Maschine Handbuch-Daten (z. B. Lampen-/Schalter-Matrix) ausgewertet wurden.",
      },
      {
        titel: "Erstellen",
        text: "Im Bereich »Troubleshooting-Guide« auf »Troubleshooting-Guide erstellen« (nur mit Schreibrecht). Claude bestimmt zunächst die Plattform bzw. Geräte-Generation und prüft sie samt bekannter Serienfehler per Websuche gegen Community-Quellen (IPDB, PinWiki, Pinside). Das dauert ein bis zwei Minuten.",
      },
      {
        titel: "Was drinsteht",
        text: "Plattformspezifische Sicherheitshinweise, systematische Fehlersuche nach Subsystemen (als Symptom-/Diagnose-Tabellen), bekannte Modellprobleme, Wege ins Diagnose-/Testmenü, ein FAQ, ein Wartungsplan und eine Werkzeug-/Ersatzteilliste — dazu Quellen zum Gegenprüfen.",
      },
      {
        titel: "Neu erstellen",
        text: "Über »Guide neu erstellen« lässt sich der Leitfaden jederzeit neu erzeugen; er ersetzt den bisherigen.",
      },
      {
        titel: "Wichtig",
        text: "Der Guide ist KI-generiert. Vor sicherheitsrelevanten Arbeiten immer mit dem Original-Manual und dem Schaltplan gegenprüfen.",
      },
    ],
  },
  {
    titel: "Wissen teilen",
    icon: <Share2 size={18} className="text-[var(--color-primary)]" />,
    einleitung:
      "Handbuch-Daten und Reparaturen mit anderen Besitzern desselben Automaten teilen — so entsteht mit der Zeit eine Reparaturdatenbank je Gerät.",
    steps: [
      {
        titel: "Voraussetzung: OPDB-Bezug",
        text: "Geteilt wird immer über den Gerätetyp. Den erkennt die App am OPDB-Eintrag (edition-genau, also Pro und Premium getrennt, weil sich die Matrizen unterscheiden). Maschinen ohne OPDB-Bezug lassen sich nicht teilen — beim Bearbeiten einen OPDB-Eintrag auswählen.",
      },
      {
        titel: "Handbuch-Daten teilen",
        text: "Hast du ein Handbuch ausgewertet, erscheint im Abschnitt »Handbuch-Daten« der Teilen-Bereich. Reichweite wählen, fertig.",
      },
      {
        titel: "Reparaturen teilen",
        text: "Unter jeder Reparatur gibt es »Teilen«. Standardmäßig anonym und ohne Kosten/Aufwand — beides lässt sich je Eintrag umschalten. Die Vorschau zeigt exakt, was andere lesen.",
      },
      {
        titel: "Reichweiten",
        text: "»Alle angemeldeten Nutzer« (öffentlich innerhalb der App, kein Zugriff aus dem offenen Internet), »Bestimmte Clubs« oder »Bestimmte Personen« per E-Mail — unabhängig von Clubs. Zusammen mit dem Anonym-Schalter deckt das alle Fälle ab.",
      },
      {
        titel: "Was du siehst",
        text: "Geteilte Handbuch-Daten anderer erscheinen auf deiner Maschinenseite; hast du selbst noch keine, ist der Bereich aufgeklappt — du sparst dir dann die eigene Auswertung. Geteilte Reparaturen stehen unter »Geteiltes Wissen«. Alles nur lesend: ändern kann nur, wer es geteilt hat.",
      },
      {
        titel: "Voreinstellungen",
        text: "Unter Konto → »Freigabe-Voreinstellungen« legst du fest, was beim Teilen vorbelegt ist, und ob neue Handbuch-Daten/Reparaturen automatisch freigegeben werden. Für Club-Maschinen gilt die Voreinstellung des Clubs (Club-Seite, nur Owner/Admin). Im Einzelfall ist alles übersteuerbar.",
      },
    ],
  },
  {
    titel: "Konto & Sicherheit",
    icon: <UserCog size={18} className="text-[var(--color-primary)]" />,
    einleitung:
      "Deine Profildaten, deine E-Mail-Adresse, dein Passwort, deine Einladungen und Clubs.",
    steps: [
      {
        titel: "Konto öffnen",
        text: "Nutzer-Icon oben rechts → »Konto«.",
      },
      {
        titel: "Name ändern",
        text: "Im Abschnitt »Profil« den Namen anpassen und speichern.",
      },
      {
        titel: "E-Mail-Adresse ändern",
        text: "Im Abschnitt »E-Mail-Adresse« die neue Adresse eintragen. Zur Sicherheit geht ein Bestätigungslink an deine BISHERIGE Adresse — erst nach dem Klick darauf wird gewechselt.",
      },
      {
        titel: "Einladungen",
        text: "Offene Club-Einladungen kannst du hier annehmen oder ablehnen.",
      },
      {
        titel: "Clubs verlassen",
        text: "Unter »Meine Clubs« siehst du deine Clubs samt Rolle und kannst sie über »Verlassen« verlassen. Bist du letzter Owner, musst du vorher jemanden zum Owner befördern — dann steht dort statt des Buttons ein Hinweis.",
      },
      {
        titel: "Passwort ändern",
        text: "Unter »Sicherheit« den Bereich »Passwort ändern« aufklappen: aktuelles Passwort, neues Passwort und Wiederholung — gleiche Regeln, mit Anzeigen/Verbergen.",
      },
      {
        titel: "Freigabe-Voreinstellungen",
        text: "Hier legst du fest, was beim Teilen von Handbuch-Daten und Reparaturen vorbelegt wird (Reichweite, anonym, Kosten) und ob automatisch freigegeben wird. Details siehe Abschnitt »Wissen teilen«.",
      },
      {
        titel: "Passwort vergessen",
        text: "Auf der Anmeldeseite »Passwort vergessen?« → du erhältst eine E-Mail mit einem Reset-Link.",
      },
    ],
  },
  {
    titel: "Administration",
    icon: <ShieldCheck size={18} className="text-[var(--color-primary)]" />,
    einleitung: "Nur für Super-Admins — Verwaltung über alle Nutzer und Clubs.",
    steps: [
      {
        titel: "Zugang",
        text: "Super-Admins finden »Administration« im Nutzer-Menü oben rechts. Festgelegt werden sie über die Umgebungsvariable SUPER_ADMIN_EMAILS; weitere lassen sich danach in der Admin-Oberfläche ernennen.",
      },
      {
        titel: "Supporter (globale Nur-Lese-Rolle)",
        text: "Unter »Nutzer« kannst du jemandem die Supporter-Rolle geben. Ein Supporter sieht zur Unterstützung alle Clubs und deren Maschinen (mit Fehlern und Reparaturen), aber KEINE privaten Sammlungen einzelner Nutzer — und kann nichts ändern, anlegen oder löschen. Rein lesend.",
      },
      {
        titel: "Nutzer einladen",
        text: "Da die Registrierung nur mit Einladung möglich ist, lädst du neue Personen unter »Nutzer einladen« per E-Mail ein — sie erhalten einen Registrierungslink. Optional kannst du eine persönliche Nachricht mitschicken. Diese Einladung ordnet keinem Club zu; dafür lädst du zusätzlich im jeweiligen Club ein. Offene Einladungen lassen sich zurückziehen.",
      },
      {
        titel: "E-Mail-Vorlagen",
        text: "Unter »E-Mail-Vorlagen« passt du Betreff und Einleitungstext der Einladungsmails an — mit Platzhaltern wie {{einlader}} und {{clubname}} sowie einer Vorschau. Der Button mit dem Einladungslink und der Gültigkeitshinweis bleiben fest, damit eine Vorlage den Link nicht versehentlich entfernt. »Zurücksetzen« stellt den Standardtext wieder her.",
      },
      {
        titel: "Nutzer",
        text: "Alle Nutzer einsehen und Super-Admin-Rechte geben oder entziehen. Der letzte Super-Admin bleibt geschützt.",
      },
      {
        titel: "Clubs & Rollen-Katalog",
        text: "Alle Clubs einsehen und bei Bedarf löschen. Darunter steht der Rollen-Katalog mit allen Rollen und ihrer Bedeutung. Ein Super-Admin darf grundsätzlich alles verwalten.",
      },
    ],
  },
  {
    titel: "Tipps",
    icon: <Lightbulb size={18} className="text-[var(--color-primary)]" />,
    einleitung: "Kleinigkeiten, die den Alltag leichter machen.",
    steps: [
      {
        titel: "Bereiche ein- und ausklappen",
        text: "Auf der Maschinen-Detailseite sind Fehler, Reparaturen, Handbuch-Daten und Troubleshooting-Guide ein-/ausklappbare Bereiche — standardmäßig eingeklappt. Die Titelzeile zeigt jeweils die Anzahl (z. B. offene Fehler), sodass du auf einen Blick siehst, was drinsteckt.",
      },
      {
        titel: "Mobil nutzen",
        text: "Die App ist für unterwegs gedacht — erfasse Fehler und Reparaturen direkt an der Maschine.",
      },
      {
        titel: "Hell/Dunkel",
        text: "Über den Umschalter in der Navigation zwischen hellem und dunklem Design wechseln.",
      },
      {
        titel: "Suchen & filtern",
        text: "Maschinen lassen sich per Suche einschränken, Fehler nach Status filtern.",
      },
    ],
  },
];

export default async function HelpPage() {
  // Der Tab „Aufbau & Betrieb" ist nur für Super-Admins.
  const user = await requireUser();
  return (
    <div className="space-y-8">
      <HelpTabs active="anleitung" istSuperAdmin={isSuperAdmin(user)} />

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Anleitung &amp; How-To</h1>
        <p className="text-[var(--color-muted)]">
          Schritt für Schritt durch alle Funktionen — von der Anmeldung über
          Maschinen, Fehler und Reparaturen bis zu Clubs, Einladungen,
          Handbuch-Daten, Troubleshooting-Guide und Konto.
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

          <Card>
            <ol className="space-y-3">
              {section.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--color-inset)] font-mono text-xs text-[var(--color-primary)]">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed">
                    {step.titel ? (
                      <span className="font-medium">{step.titel}. </span>
                    ) : null}
                    <span className="text-[var(--color-muted)]">{step.text}</span>
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </section>
      ))}
    </div>
  );
}
