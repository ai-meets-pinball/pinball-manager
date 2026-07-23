import {
  AlertTriangle,
  Boxes,
  Cloud,
  Database,
  FileText,
  FlaskConical,
  GitBranch,
  KeyRound,
  Layers,
  Mail,
  RefreshCw,
  Rocket,
  Share2,
  Sparkles,
  Terminal,
} from "lucide-react";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { HelpTabs } from "@/components/help-tabs";
import { Card } from "@/components/ui/card";
import { isSuperAdmin, requireUser } from "@/lib/session";

/*
  Aufbau- und Betriebsdokumentation — nur für Super-Admins.

  Zweck: nachvollziehbar machen, wie diese Anwendung entstanden ist, damit
  jemand ohne Vorwissen die Schritte nachvollziehen und für ein eigenes
  Projekt wiederholen kann. Bewusst mit den echten Befehlen, den echten
  Namen der Umgebungsvariablen und — wichtiger als alles andere — mit den
  Stolperfallen, die uns tatsächlich Zeit gekostet haben.

  Wie die übrigen Hilfeseiten: Inhalt als Daten oben, Darstellung unten.
*/

type Schritt = {
  titel: string;
  text: string;
  /** Befehl oder Codezeile zum Nachmachen. */
  befehl?: string;
  /** Stolperfalle — wird hervorgehoben. */
  falle?: string;
};

type Abschnitt = {
  titel: string;
  icon: ReactNode;
  einleitung: string;
  schritte: Schritt[];
};

const ICON = "text-[var(--color-primary)]";

const abschnitte: Abschnitt[] = [
  {
    titel: "1 · Zuerst das PRD: was soll das Ding können?",
    icon: <FileText size={18} className={ICON} />,
    einleitung:
      "Ein PRD (Product Requirements Document) hält fest, WAS gebaut wird und warum — bevor die erste Zeile Code entsteht. Das Dokument dieses Projekts liegt unter docs/PRD-Pinball-Manager.md und ist bewusst nur rund 100 Zeilen lang.",
    schritte: [
      {
        titel: "Mit dem Problem anfangen, nicht mit der Lösung",
        text: "Abschnitt 1 und 2: Wen betrifft das Problem, und was ist heute daran mühsam? Hier war es: Flipperbesitzer notieren Fehler und Reparaturen auf Zetteln oder gar nicht, und Handbuchwissen liegt in PDFs. Wer mit „ich baue eine App mit Datenbank\" anfängt, baut am Problem vorbei.",
      },
      {
        titel: "Ziele UND Nicht-Ziele aufschreiben",
        text: "Der wertvollste Abschnitt ist der über die Nicht-Ziele. Was ausdrücklich NICHT gebaut wird, verhindert später endlose Diskussionen. Ein Satz wie „kein Ersatzteil-Shop, keine Turnierverwaltung\" spart Wochen.",
      },
      {
        titel: "Funktionen in Phasen schneiden",
        text: "Abschnitt 4 listet die Kernfunktionen, jeweils mit Phase: MVP (Maschinen, Fehler, Reparaturen), Phase 2 (Handbuch-Auswertung), Phase 3 (KI-Diagnose, Bilderkennung). So bleibt ein lieferbarer erster Stand übrig, statt alles halb fertig zu haben.",
        falle:
          "Alles in den MVP zu packen ist der häufigste Anfängerfehler. Die Frage lautet nicht „was wäre schön\", sondern „was ist das Kleinste, das jemand tatsächlich benutzen würde\".",
      },
      {
        titel: "Rechtliche Leitplanken früh klären",
        text: "Abschnitt 6 klärt hier das Urheberrecht an Handbüchern. Das war keine Formalie: daraus folgte die gesamte Architektur der Auswertung (PDF nur im Arbeitsspeicher, nur Fakten speichern). Solche Punkte im Nachhinein einzubauen bedeutet Umbau statt Aufbau.",
      },
      {
        titel: "Datenmodell grob skizzieren",
        text: "Abschnitt 5 listet die Tabellen mit ihren wichtigsten Feldern — eine Skizze, kein fertiges Schema. Sie zwingt dazu, Beziehungen zu durchdenken: Gehört ein Fehler zur Maschine oder zur Reparatur? (Hier: zur Maschine, und die Reparatur verweist optional darauf.)",
      },
      {
        titel: "Offene Fragen stehen lassen",
        text: "Abschnitt 11 sammelt, was noch unklar ist. Das ist kein Makel, sondern ehrlich — und es verhindert, dass eine Frage stillschweigend falsch entschieden wird.",
        falle:
          "Ein PRD, das nicht nachgeführt wird, wird zur Lüge. Im Code wird hier auf Abschnitte verwiesen („PRD §7\"); ändert sich die Entscheidung, muss das Dokument mit.",
      },
    ],
  },
  {
    titel: "2 · Techstack wählen",
    icon: <Layers size={18} className={ICON} />,
    einleitung:
      "Abschnitt 7 des PRD legt den Stack fest — verbindlich. Für einen Einzelentwickler zählen andere Kriterien als für ein großes Team.",
    schritte: [
      {
        titel: "Die Kriterien, die hier entschieden haben",
        text: "1. Eine Sprache durchgängig (TypeScript vorne wie hinten). 2. Wenige bewegliche Teile — jeder zusätzliche Dienst ist ein weiterer Ort für Fehler. 3. Gute Dokumentation und viele Beispiele im Netz. 4. Kostenloser Einstieg. 5. Man kann es später verlassen, ohne alles neu zu schreiben.",
      },
      {
        titel: "Die konkreten Entscheidungen und ihr Grund",
        text: "Next.js: Oberfläche und Server in einem Projekt, kein separates Backend. Postgres: die Daten sind klar relational (Maschine → Fehler → Reparatur). Drizzle: das Schema IST TypeScript, daraus kommen Typen und Migrationen. Better Auth: Anmeldung als lesbare Konfiguration im eigenen Code statt als fremder Dienst. Tailwind: Gestaltung direkt an der Komponente. Vercel: baut Next.js ohne Konfiguration.",
      },
      {
        titel: "Auch die Nicht-Entscheidungen festhalten",
        text: "Ebenso wichtig: Supabase wird NUR als Datenbank und Dateispeicher genutzt — nicht für Anmeldung, nicht als API. Und es gibt bewusst kein Row-Level-Security. Solche Sätze im PRD verhindern, dass sich später schleichend eine zweite Architektur einschleicht.",
      },
      {
        titel: "Die Festlegung an einer zweiten Stelle wiederholen",
        text: "In CLAUDE.md steht der Stack noch einmal mit dem Zusatz „nicht ohne Absprache ersetzen\". Diese Datei liest ein KI-Assistent bei jeder Sitzung — so bleibt die Entscheidung auch dann bestehen, wenn niemand mehr den Grund erinnert.",
      },
      {
        titel: "Nicht nach Beliebtheit wählen",
        text: "Für jemanden, der allein und nebenbei baut, ist die Menge an auffindbaren Antworten wichtiger als technische Eleganz. Ein etwas älteres, weit verbreitetes Werkzeug schlägt das neueste, über das es drei Blogposts gibt.",
        falle:
          "Der teuerste Fehler ist ein Stack, den man im Fehlerfall nicht durchschaut. Wenn du nicht erklären kannst, was ein Baustein tut, gehört er (noch) nicht ins Projekt.",
      },
    ],
  },
  {
    titel: "3 · Werkzeuge auf dem Rechner",
    icon: <Terminal size={18} className={ICON} />,
    einleitung:
      "Ohne diese drei Dinge geht nichts. Alles andere läuft später in der Cloud.",
    schritte: [
      {
        titel: "Node.js installieren",
        text: "Node ist die Laufzeitumgebung, in der die Anwendung läuft. Am saubersten über den Versionsmanager nvm — damit lassen sich mehrere Node-Versionen parallel betreiben, ohne das System zu verändern.",
        befehl:
          "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash\nnvm install 20 && nvm use 20\nnode -v   # erwartet: v20.x",
      },
      {
        titel: "Git installieren und einrichten",
        text: "Git verwaltet die Versionsgeschichte des Codes. Auf dem Mac reicht meist `xcode-select --install`.",
        befehl:
          'git config --global user.name "Dein Name"\ngit config --global user.email "du@example.com"',
      },
      {
        titel: "Konten anlegen",
        text: "Kostenlos und jeweils in wenigen Minuten: GitHub (Code), Vercel (Hosting), Supabase (Datenbank + Dateispeicher). Später kommen Resend (E-Mail), OPDB (Flipperdaten) und Anthropic (KI-Auswertung) dazu.",
      },
    ],
  },
  {
    titel: "4 · Git-Repository",
    icon: <GitBranch size={18} className={ICON} />,
    einleitung:
      "Der Code lebt in einem Repository. Das ist die Grundlage für alles Weitere — Vercel deployt direkt daraus.",
    schritte: [
      {
        titel: "Repository auf GitHub anlegen",
        text: "Auf github.com ein neues, leeres Repository erstellen (hier: ai-meets-pinball/pinball-manager). Ohne README anlegen, das kommt gleich aus dem Projekt.",
      },
      {
        titel: "Lokal verbinden und ersten Stand hochladen",
        text: "Im Projektordner das lokale Repository anlegen und mit GitHub verbinden.",
        befehl:
          "git init\ngit add -A && git commit -m \"Initial commit\"\ngit branch -M main\ngit remote add origin https://github.com/<konto>/<repo>.git\ngit push -u origin main",
      },
      {
        titel: "Was NICHT ins Repository gehört",
        text: "Zugangsdaten niemals einchecken. `.env.local` steht in `.gitignore`; als Vorlage dient `.env.example`, in der nur die NAMEN der Variablen stehen, keine Werte.",
        falle:
          "Einmal versehentlich eingecheckte Schlüssel bleiben in der Git-Historie, auch wenn man sie später löscht. Dann hilft nur: Schlüssel beim Anbieter zurückziehen und neu erzeugen.",
      },
    ],
  },
  {
    titel: "5 · Next.js-Projekt",
    icon: <Boxes size={18} className={ICON} />,
    einleitung:
      "Next.js liefert Server und Oberfläche in einem. Diese Anwendung nutzt Version 16 mit App Router und React 19.",
    schritte: [
      {
        titel: "Projekt erzeugen",
        text: "Der Assistent fragt ein paar Optionen ab: TypeScript ja, Tailwind CSS ja, App Router ja, `src/`-Verzeichnis ja.",
        befehl: "npx create-next-app@latest pinball-manager",
      },
      {
        titel: "Entwicklungsserver starten",
        text: "Wir haben den Port fest auf 3100 gelegt, damit er nicht mit anderen Projekten kollidiert (in `package.json` unter `scripts.dev`).",
        befehl: 'npm run dev      # "next dev -p 3100"',
        falle:
          "Next 16 erlaubt pro Projektverzeichnis nur EINEN laufenden Dev-Server. Ein vergessener Server blockiert später auch die Tests.",
      },
      {
        titel: "Umbenennung kennen: middleware heißt jetzt proxy",
        text: "In Next 16 heißt die Datei, die Anfragen vor den Seiten abfängt, `src/proxy.ts` statt `middleware.ts`. Bei uns prüft sie nur, ob überhaupt ein Session-Cookie da ist — die echte Rechteprüfung passiert in den Seiten und Server Actions.",
      },
    ],
  },
  {
    titel: "6 · Supabase: Datenbank und Dateispeicher",
    icon: <Database size={18} className={ICON} />,
    einleitung:
      "Supabase wird hier BEWUSST nur als Postgres-Datenbank und Dateispeicher genutzt — nicht für Anmeldung, nicht als API.",
    schritte: [
      {
        titel: "Projekt anlegen",
        text: "Auf supabase.com ein Projekt erstellen, Region in der Nähe wählen, Datenbank-Passwort sicher notieren.",
      },
      {
        titel: "Die zwei Verbindungs-URLs verstehen",
        text: "Supabase gibt zwei Adressen aus: eine über den Pooler (Port 6543) und eine direkte (Port 5432). Die Anwendung nutzt die Pooler-URL, weil serverlose Funktionen viele kurze Verbindungen aufbauen.",
        falle:
          "Schema-Änderungen (Migrationen) über den Pooler schlagen fehl — teils sogar STILL, mit Erfolgsmeldung und ohne Wirkung. Migrationen deshalb immer gegen die DIREKTE URL (Port 5432) fahren und danach nachsehen, ob die Tabellen wirklich da sind.",
      },
      {
        titel: "Speicher-Bucket für Fotos",
        text: "Unter Storage einen öffentlichen Bucket `machine-photos` anlegen. Öffentlich, damit Bilder ohne Umweg ausgeliefert werden.",
        falle:
          "Weil der Bucket öffentlich ist, darf man Dateiendung und Dateityp NIE aus der hochgeladenen Datei übernehmen — sonst lädt jemand eine HTML-Datei hoch, die dann als aktive Seite ausgeliefert wird. Wir prüfen deshalb die ersten Bytes der Datei (siehe `src/lib/storage.ts`).",
      },
      {
        titel: "Kein Row-Level-Security",
        text: "Eine bewusste Entscheidung dieses Projekts: die Zugriffsregeln stehen NICHT in der Datenbank, sondern sichtbar im TypeScript-Code (`src/lib/session.ts`). Das ist leichter nachvollziehbar — verlangt aber, dass wirklich jeder Zugriffspfad durch diese Funktionen läuft.",
      },
    ],
  },
  {
    titel: "7 · Drizzle: Tabellen aus TypeScript",
    icon: <Database size={18} className={ICON} />,
    einleitung:
      "Das Datenmodell steht als TypeScript in `src/db/schema.ts`. Daraus werden sowohl die Typen als auch die SQL-Migrationen erzeugt.",
    schritte: [
      {
        titel: "Schema schreiben, Migration erzeugen, einspielen",
        text: "Nach jeder Änderung an `schema.ts` eine Migration erzeugen und anwenden.",
        befehl:
          'npm run db:generate                 # SQL aus dem Schema erzeugen\nDATABASE_URL="<direkte-5432-URL>" npm run db:migrate',
      },
      {
        titel: "Neue Umgebung aufsetzen: push statt migrate",
        text: "Für eine ganz frische Datenbank ist `push` der zuverlässige Weg — es überträgt den aktuellen Schemastand direkt.",
        befehl: 'DATABASE_URL="<url>" npx drizzle-kit push --force',
        falle:
          "`drizzle-kit migrate` wendet auf einer LEEREN Datenbank nichts an und meldet trotzdem Erfolg (Exit-Code 0, null Tabellen). Immer mit einer Zählabfrage gegenprüfen, dem Exit-Code nicht glauben.",
      },
      {
        titel: "Aufzählungstypen (Enums) meiden",
        text: "Wir verwenden für Wertelisten normale Textspalten mit dokumentierten Werten statt Postgres-Enums.",
        falle:
          "`ALTER TYPE … ADD VALUE` scheitert in der Transaktionsklammer von drizzle-kit, und ein neuer Enum-Wert darf in derselben Transaktion nicht benutzt werden. Genau daran ist eine Migration hier gescheitert; wir haben deshalb Rollen später auf eine Tabelle umgestellt.",
      },
      {
        titel: "Datenmigrationen getrennt halten",
        text: "Struktur und Daten in getrennte Migrationen legen: erst Tabellen anlegen, dann in einer eigenen Datei die Daten umziehen, dann Altes entfernen. Das hält jeden Schritt für sich nachvollziehbar.",
      },
    ],
  },
  {
    titel: "8 · Better Auth: Anmeldung",
    icon: <KeyRound size={18} className={ICON} />,
    einleitung:
      "Anmeldung mit E-Mail und Passwort, als lesbare TypeScript-Konfiguration statt als fremder Dienst.",
    schritte: [
      {
        titel: "Installieren und Tabellen erzeugen",
        text: "Better Auth bringt eigene Tabellen mit (user, session, account, verification). Der Generator schreibt sie als Drizzle-Schema.",
        befehl:
          "npm i better-auth\nnpm run auth:generate    # erzeugt src/db/auth-schema.ts",
      },
      {
        titel: "Geheimnis und Basis-URL setzen",
        text: "Ohne diese beiden Variablen startet die Anmeldung nicht.",
        befehl:
          'BETTER_AUTH_SECRET="$(openssl rand -base64 32)"\nBETTER_AUTH_URL="http://localhost:3100"',
      },
      {
        titel: "Rechteprüfung an EINER Stelle",
        text: "Alle Zugriffe laufen über wenige Funktionen in `src/lib/session.ts` (`requireUser`, `requireMachineAccess`, `requireClubManager` …). Diese geben auch die Berechtigungsstufe zurück, damit die Oberfläche genau das anzeigt, was der Server auch erlaubt.",
        falle:
          "Zeigt die Oberfläche einen Knopf, den die Server-Aktion später ablehnt, ist das ein Fehler — bei uns war „Löschen\" lange für jedes Clubmitglied sichtbar.",
      },
      {
        titel: "Registrierung nur mit Einladung",
        text: "Die Prüfung hängt am Einladungs-TOKEN aus der E-Mail, nicht an der Adresse. Der Ablauf: Server-Aktion prüft den Token, markiert die Einladung als „wird eingelöst\", erst dann wird das Konto angelegt.",
        falle:
          "Nur zu prüfen, ob für eine Adresse eine Einladung existiert, reicht NICHT: Wer die eingeladene Adresse kennt, registriert sie sonst selbst. Genau dieser Fehler steckte hier drin und wurde erst im Sicherheits-Review gefunden.",
      },
    ],
  },
  {
    titel: "9 · Vercel: Veröffentlichen",
    icon: <Cloud size={18} className={ICON} />,
    einleitung:
      "Vercel baut die Anwendung bei jedem Push und stellt sie online. Für Next.js ist das der Weg mit den wenigsten Überraschungen.",
    schritte: [
      {
        titel: "Projekt verbinden",
        text: "Auf vercel.com „New Project\" → GitHub-Repository auswählen. Vercel erkennt Next.js selbstständig; Build-Einstellungen können so bleiben.",
      },
      {
        titel: "Supabase-Integration hinzufügen",
        text: "Über den Vercel-Marktplatz die Supabase-Integration verbinden. Sie legt die Datenbank-Variablen automatisch an — allerdings unter eigenen Namen wie `POSTGRES_URL`.",
        befehl:
          "// src/db/index.ts berücksichtigt beide Namen:\nprocess.env.DATABASE_URL ?? process.env.POSTGRES_URL",
      },
      {
        titel: "Alle übrigen Variablen eintragen",
        text: "Was lokal in `.env.local` steht, muss auch bei Vercel hinterlegt werden — sonst funktioniert online genau das nicht, was den fehlenden Schlüssel braucht.",
        befehl:
          "BETTER_AUTH_SECRET, BETTER_AUTH_URL (echte Domain!), SUPER_ADMIN_EMAILS,\nRESEND_API_KEY, EMAIL_FROM, OPDB_API_KEY, ANTHROPIC_API_KEY,\nNEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_BUCKET",
        falle:
          "`BETTER_AUTH_URL` muss online die echte Domain sein. Bleibt dort localhost, gehen Anmelde- und Einladungslinks ins Leere.",
      },
      {
        titel: "Lange Aufgaben brauchen mehr Zeit",
        text: "Die Handbuch-Auswertung dauert Minuten. Deshalb steht auf der Maschinenseite `export const maxDuration = 300` — ohne das bricht Vercel die Funktion vorher ab.",
      },
    ],
  },
  {
    titel: "10 · Resend: E-Mails",
    icon: <Mail size={18} className={ICON} />,
    einleitung:
      "Passwort-Zurücksetzen, Einladungen und Adressbestätigungen brauchen einen Versanddienst.",
    schritte: [
      {
        titel: "Konto und Schlüssel",
        text: "Auf resend.com registrieren, API-Schlüssel erzeugen, als `RESEND_API_KEY` hinterlegen.",
      },
      {
        titel: "Absenderadresse",
        text: "Zum Ausprobieren genügt `onboarding@resend.dev`. Für echten Betrieb eine eigene Domain verifizieren, sonst landen Mails im Spam.",
        befehl: 'EMAIL_FROM="Pinball Manager <noreply@deine-domain.de>"',
      },
      {
        titel: "Ohne Schlüssel kein Versand",
        text: "Fehlt der Schlüssel, wird die Einladung zwar gespeichert, aber niemand bekommt den Link. Die Oberfläche sagt das inzwischen deutlich.",
      },
    ],
  },
  {
    titel: "11 · OPDB und Claude",
    icon: <Sparkles size={18} className={ICON} />,
    einleitung:
      "Zwei externe Dienste liefern die Fachdaten: Automatenstammdaten und die Auswertung von Handbüchern.",
    schritte: [
      {
        titel: "OPDB-Token",
        text: "Auf opdb.org ein Konto anlegen und einen API-Token erzeugen (`OPDB_API_KEY`). Die Suche funktioniert ohne Token, die Detaildaten nicht.",
      },
      {
        titel: "Anthropic-Schlüssel",
        text: "Auf console.anthropic.com einen Schlüssel erzeugen (`ANTHROPIC_API_KEY`). Modell über `ANTHROPIC_MODEL` überschreibbar.",
      },
      {
        titel: "Optional: lokales Modell (Ollama) statt Claude",
        text: "Mit `AI_PROVIDER=ollama` laufen die drei KI-Funktionen (Handbuch, Guide, Wartungs-Import) über ein lokales Modell: `ollama serve` starten, `ollama pull gemma3:12b` ziehen, `OLLAMA_MODEL`/`OLLAMA_VISION_MODEL` setzen. Vorteil: das Handbuch verlässt die Maschine nie. Für präzise Tabellen ≥12B nehmen; kleinere Modelle sind unzuverlässig.",
        falle:
          "Ein lokales Ollama unter localhost:11434 ist von Vercel aus NICHT erreichbar — der Ollama-Pfad ist nur für lokale/self-hosted Läufe. Und: der Troubleshooting-Guide entsteht dann OHNE Websuche (in der Anzeige gekennzeichnet).",
      },
      {
        titel: "Urheberrecht: die Pipeline ist der Schutz",
        text: "Das hochgeladene Handbuch-PDF wird NIE gespeichert. Es lebt nur im Arbeitsspeicher, geht an das Modell, und nur die extrahierten Faktentabellen landen in der Datenbank. Dazu die Bestätigung des Nutzers, dass er das Handbuch besitzen darf.",
        falle:
          "Große Antworten müssen gestreamt werden. Mit einem zu kleinen Antwort-Limit bricht die Ausgabe mitten im JSON ab — der Fehler sieht dann wie ein Parser-Problem aus, ist aber ein Limit-Problem.",
      },
    ],
  },
  {
    titel: "12 · Rollen, Einladungen, Teilen",
    icon: <Share2 size={18} className={ICON} />,
    einleitung:
      "Die fachlichen Bausteine, die aus der Einzelanwendung eine gemeinsam genutzte machen.",
    schritte: [
      {
        titel: "Rollen als Daten, nicht als Enum",
        text: "Ein Katalog `roles` plus Zuweisungen `role_assignments`. Ist eine Zuweisung an einen Club gebunden, IST sie die Mitgliedschaft — eine separate Mitglieder-Tabelle gibt es nicht.",
      },
      {
        titel: "Gerätetyp als gemeinsamer Anker",
        text: "Jede Maschine zeigt auf einen Eintrag im Katalog `machine_models` (eine Zeile je OPDB-Edition). Nur darüber finden sich zwei Besitzer desselben Automaten.",
      },
      {
        titel: "Teilen: Reichweite mal Flag",
        text: "Statt vieler Einzelfälle gibt es drei Reichweiten (alle Angemeldeten, bestimmte Clubs, bestimmte Personen) und dazu einen Anonym-Schalter. Das deckt alle Kombinationen ab.",
        falle:
          "Verborgene Felder (Kosten, Aufwand, Name) müssen SERVERSEITIG entfernt werden. Sie erst in der Anzeige auszublenden liefert sie trotzdem an den Browser aus.",
      },
    ],
  },
  {
    titel: "13 · Tests",
    icon: <FlaskConical size={18} className={ICON} />,
    einleitung:
      "Automatisierte Tests, die die Anwendung wie ein echter Benutzer bedienen — die Absicherung gegen Rückschritte.",
    schritte: [
      {
        titel: "Eigene Testdatenbank",
        text: "Tests legen Daten an und löschen sie wieder. Das darf niemals die echte Datenbank treffen. Lokal genügt ein Container.",
        befehl:
          "docker run -d --name pinball-e2e -e POSTGRES_PASSWORD=e2e \\\n  -p 5433:5432 postgres:16\n# .env.local:\n# E2E_DATABASE_URL=\"postgresql://postgres:e2e@localhost:5433/postgres\"",
      },
      {
        titel: "Schema einspielen und starten",
        text: "Erst das Schema übertragen, dann den Browser holen, dann die Suite starten.",
        befehl:
          'DATABASE_URL="$E2E_DATABASE_URL" npx drizzle-kit push --force\nnpm run e2e:install\nnpm run e2e',
      },
      {
        titel: "Kein Test-Hintertürchen",
        text: "Die Tests melden sich über den echten Login an; die Testkonten entstehen über den regulären Einladungsweg. Eine Abkürzung, die die Rechteprüfung umgeht, würde genau an dem vorbeitesten, was abgesichert werden soll — und wäre Code, der in der Produktion nichts zu suchen hat.",
      },
    ],
  },
  {
    titel: "14 · Nicht fertig, sondern laufend: Pflege",
    icon: <RefreshCw size={18} className={ICON} />,
    einleitung:
      "Eine Anwendung ist mit dem ersten Deployment nicht fertig, sondern erst geboren. Ohne regelmäßige Pflege verrottet Software leise — sie tut noch, aber wird von Monat zu Monat unsicherer und schwerer zu ändern. Diese Dinge gehören in einen festen Rhythmus, nicht in „irgendwann\".",
    schritte: [
      {
        titel: "Code-Reviews — auch als Einzelperson",
        text: "Jede Änderung noch einmal mit Abstand durchsehen, bevor sie bleibt. Wer allein arbeitet, lässt einen zweiten Blick draufsehen — eine Kollegin oder einen KI-Assistenten. In diesem Projekt hat genau so ein Review gravierende Lücken gefunden, die beim Schreiben niemandem aufgefallen waren.",
        falle:
          "Der gefährlichste Satz ist „läuft doch\". Dass etwas funktioniert, heißt nicht, dass es richtig oder sicher ist — die kritischste Lücke hier lief monatelang fehlerfrei.",
      },
      {
        titel: "Security-Audits regelmäßig, nicht nur einmal",
        text: "Gezielt aus Angreifersicht draufschauen: Kann jemand etwas sehen, ändern oder löschen, das ihm nicht gehört? Kann sich jemand unberechtigt anmelden oder Rechte verschaffen? Solche Prüfungen wiederholen — mit jeder neuen Funktion entsteht neue Angriffsfläche.",
        falle:
          "Ein Test muss den ANGRIFF versuchen, nicht den Normalfall. Ein Test, der nur zeigt „Registrierung klappt\", übersieht die Lücke „Registrierung klappt auch für Fremde\".",
      },
      {
        titel: "Unit-Tests für die kniffligen Stellen",
        text: "Kleine, schnelle Tests für einzelne Funktionen mit fieser Logik — Passwortregeln, das Zerlegen einer Kennung, das Ausblenden von Feldern. Sie laufen in Millisekunden und sagen sofort, wenn eine spätere Änderung eine alte Annahme bricht.",
      },
      {
        titel: "End-to-End-Tests für die wichtigen Wege",
        text: "Tests, die die Anwendung wie ein echter Nutzer bedienen — anmelden, teilen, Rechte prüfen (Abschnitt 13). Nach jeder Änderung an Anmeldung, Rollen oder Freigaben laufen lassen: genau diese Pfade sichern sie ab. Kaputt heißt hier: sofort anhalten, nicht ausliefern.",
      },
      {
        titel: "Abhängigkeiten aktuell halten",
        text: "Die verwendeten Bibliotheken (in package.json) bekommen laufend Updates — auch Sicherheitskorrekturen. Regelmäßig prüfen, was veraltet oder verwundbar ist, und in kleinen Schritten aktualisieren, nicht alles auf einmal.",
        befehl:
          "npm outdated        # was ist neuer verfügbar?\nnpm audit           # bekannte Sicherheitslücken\nnpm update          # verträgliche Updates einspielen",
        falle:
          "Nach jedem Update Tests und Build laufen lassen. Ein Sprung auf eine neue Hauptversion (z. B. Next 16 → 17) ändert oft Verhalten — solche Updates einzeln machen und die Änderungshinweise lesen, nicht blind aktualisieren.",
      },
      {
        titel: "Refactoring: aufräumen, bevor es weh tut",
        text: "Wenn dieselbe Logik an drei Stellen steht oder eine Datei nur noch schwer zu verstehen ist, lohnt das Umbauen — mit Tests als Netz, damit sich das Verhalten dabei nicht ändert. In diesem Projekt wurde etwa das Rollenmodell von einer starren Aufzählung auf eine flexible Tabelle umgestellt, als absehbar war, dass mehr Rollen kommen.",
        falle:
          "Refactoring heißt: Struktur verbessern, Verhalten gleich lassen. Umbau und neue Funktion NICHT im selben Schritt — sonst weiß man bei einem Fehler nicht, woran es lag.",
      },
      {
        titel: "Einen Rhythmus daraus machen",
        text: "Als grobe Richtschnur: Reviews bei jeder Änderung, Tests bei jeder Änderung, ein Abhängigkeits- und Sicherheits-Check monatlich, ein ehrlicher Blick auf Aufräumbedarf quartalsweise. Feste Termine schlagen guten Vorsatz.",
      },
    ],
  },
  {
    titel: "15 · Was uns wirklich Zeit gekostet hat",
    icon: <AlertTriangle size={18} className={ICON} />,
    einleitung:
      "Die Sammlung der Fallen, die man in keiner Anleitung findet — aber jede zweite davon trifft auch ein anderes Projekt.",
    schritte: [
      {
        titel: "Werkzeuge, die Erfolg melden ohne zu arbeiten",
        text: "Migrationen über den Pooler und Migrationen auf einer leeren Datenbank endeten beide mit Exit-Code 0 und ohne Wirkung. Merksatz: nach jedem Schema-Schritt nachzählen, nicht dem Rückgabewert glauben.",
      },
      {
        titel: "Serverseitiger Code im Browser-Bundle",
        text: "Eine Client-Komponente importierte eine Hilfsfunktion aus einer Datei, die auch den Datenbankzugriff enthielt — prompt landete der Postgres-Treiber im Browser-Paket und der Build brach mit „Can't resolve 'fs'\" ab. Reine Hilfsfunktionen gehören in eigene, datenbankfreie Dateien.",
      },
      {
        titel: "Erfundene Optionen einer Bibliothek",
        text: "Eine Konfigurationsoption wurde plausibel benannt, existierte aber nicht — die Funktion war monatelang tot, während die Oberfläche Erfolg meldete. TypeScript hatte gewarnt; die Warnung wurde durch manuelles Typisieren stillgelegt.",
        falle:
          "Wenn die Typprüfung bei einer Bibliotheks-Option meckert, ist meist der Name falsch — nicht der Typ. Erst in der Bibliothek nachsehen, dann schreiben.",
      },
      {
        titel: "Rechteprüfung an der falschen Kennung",
        text: "Eine Aktion prüfte die Berechtigung an der Maschine, löschte aber anhand einer Reparatur-Kennung, die nie zu dieser Maschine gehören musste. Merksatz: gegen dasselbe Objekt prüfen, das man anschließend verändert.",
      },
      {
        titel: "Sicherheit erst prüfen, dann behaupten",
        text: "Ein Test hatte die kritischste Lücke sogar vorgeführt — er wurde als Bestätigung gelesen, weil die Registrierung „erfolgreich\" war. Ein Test muss den ANGRIFF versuchen, nicht nur den Normalfall.",
      },
    ],
  },
];

export default async function SetupHelpPage() {
  const user = await requireUser();
  if (!isSuperAdmin(user)) redirect("/help");

  return (
    <div className="space-y-8">
      <HelpTabs active="setup" istSuperAdmin />

      <div className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Rocket size={22} className={ICON} />
          Aufbau &amp; Betrieb
        </h1>
        <p className="text-[var(--color-muted)]">
          Wie diese Anwendung entstanden ist — von der ersten Zeile bis zum
          laufenden Betrieb, in der Reihenfolge, in der man es selbst machen
          würde. Gedacht zum Nachvollziehen und zum Wiederverwenden für ein
          eigenes Projekt. Die hervorgehobenen Stellen sind Fehler, die hier
          tatsächlich passiert sind.
        </p>
      </div>

      {abschnitte.map((abschnitt) => (
        <section key={abschnitt.titel} className="space-y-3">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              {abschnitt.icon}
              {abschnitt.titel}
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              {abschnitt.einleitung}
            </p>
          </div>

          <Card>
            <ol className="space-y-4">
              {abschnitt.schritte.map((schritt, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--color-inset)] font-mono text-xs text-[var(--color-primary)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 space-y-2">
                    <p className="text-sm leading-relaxed">
                      <span className="font-medium">{schritt.titel}. </span>
                      <span className="text-[var(--color-muted)]">
                        {schritt.text}
                      </span>
                    </p>

                    {schritt.befehl ? (
                      <pre className="overflow-x-auto rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 font-mono text-xs leading-relaxed text-[var(--color-fg)]">
                        {schritt.befehl}
                      </pre>
                    ) : null}

                    {schritt.falle ? (
                      <div
                        className="flex gap-2 rounded-[var(--radius)] border border-[var(--color-warn)] p-2.5"
                        style={{
                          background:
                            "color-mix(in srgb, var(--color-warn) 10%, transparent)",
                        }}
                      >
                        <AlertTriangle
                          size={14}
                          className="mt-0.5 flex-none text-[var(--color-warn)]"
                        />
                        <p className="text-xs leading-relaxed">
                          <span className="font-semibold">Stolperfalle: </span>
                          {schritt.falle}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </section>
      ))}

      <p className="text-sm text-[var(--color-muted)]">
        Ergänzende Details zu den eingesetzten Bibliotheken stehen im Tab{" "}
        <strong>Techstack</strong>, die Bedienung der Anwendung unter{" "}
        <strong>Anleitung</strong>.
      </p>
    </div>
  );
}
