# Pinball Manager

**Reparatur- und Verwaltungsdatenbank für Flipperautomaten** — Maschinen verwalten, Fehler erfassen, Reparaturen dokumentieren und Fehler KI-gestützt diagnostizieren.

> Status: 🚧 frühe Entwicklung (Phase 1 / MVP)

---

## Worum geht's

Pinball Manager hilft Einzelsammlern und Clubs, den Überblick über ihre Flipperautomaten zu behalten: Welche Maschine hat welchen Fehler, was wurde wann repariert, welche Teile sind verbaut. Faktische Daten aus Handbüchern (Solenoid-Tabellen, Switch-Matrix, Teilelisten) werden strukturiert nutzbar gemacht — die urheberrechtlich geschützte Ausdrucksform der Handbücher selbst wird **nicht** gespeichert (siehe [Rechtliche Hinweise](#rechtliche-hinweise)).

Das Projekt ist gleichzeitig das durchgängige Lehrbeispiel der Gruppe **„KI meets Pinball"** — vom PRD bis zum Live-Deployment. Details zum Produkt: [`docs/PRD-Pinball-Manager.md`](docs/PRD-Pinball-Manager.md).

## Funktionen

**Phase 1 (MVP)**
- Maschinen anlegen und verwalten (Hersteller, Modell, Baujahr, OPDB-/IPDB-Referenz, Foto)
- Fehler erfassen und nachverfolgen (offen / in Arbeit / behoben)
- Reparaturen dokumentieren, optional mit Fehlern verknüpft
- Suche & Filter

**Phase 2**
- Handbuch-Upload mit OCR-Faktenextraktion (Quell-PDF wird nach Verarbeitung gelöscht)
- Anzeige der Faktendaten im Stil der WPC-Service-Konsole

**Phase 3**
- KI-Fehlerdiagnose auf Basis erfasster Fehler + Maschinendaten
- Bildbasierte Bauteil-Erkennung
- Club-Funktionen

## Tech-Stack

- **Framework:** Next.js (Turbopack, React 19, Node 20+)
- **Auth:** Better Auth (App-Layer-Autorisierung, sichtbare TS-Konfiguration)
- **Styling:** Tailwind CSS v4, Lucide React
- **Daten & Storage:** Supabase als reines Postgres + Storage
- **Deployment:** Vercel
- **Domain:** United Domains

## Erste Schritte

Voraussetzungen: **Node 20+** und ein **Supabase-Projekt** (für Postgres + Storage).

```bash
# Repo klonen
git clone https://github.com/<dein-user>/<dein-repo>.git
cd <dein-repo>

# Abhängigkeiten installieren
npm install

# Umgebungsvariablen anlegen
cp .env.example .env.local
# .env.local mit deinen Werten füllen (siehe unten)

# Dev-Server starten
npm run dev
```

Die App läuft dann auf [http://localhost:3000](http://localhost:3000).

### Umgebungsvariablen

```env
# Datenbank (Supabase Postgres)
DATABASE_URL="postgresql://..."

# Better Auth
BETTER_AUTH_SECRET="<zufälliges-secret>"
BETTER_AUTH_URL="http://localhost:3000"

# Supabase Storage (nur Storage — nicht Auth, nicht Daten)
NEXT_PUBLIC_SUPABASE_URL="https://<projekt>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
NEXT_PUBLIC_SUPABASE_BUCKET="machine-photos"
```

### Datenbank einrichten

```bash
# Schema in die Datenbank schreiben (erzeugt alle Tabellen)
npm run db:migrate     # oder für schnelles Iterieren: npm run db:push
```

Außerdem im Supabase-Dashboard einen **öffentlichen Storage-Bucket** namens
`machine-photos` anlegen (für die Maschinenfotos).

> Stack-Notiz: Datenzugriff über **Drizzle ORM** (Schema in [`src/db/schema.ts`](src/db/schema.ts)),
> Auth über **Better Auth** ([`src/lib/auth.ts`](src/lib/auth.ts)). Die Autorisierung liegt
> bewusst in der App-Schicht ([`src/lib/session.ts`](src/lib/session.ts)) — kein Supabase RLS.

## Rechtliche Hinweise

Der Schutz liegt in der **Pipeline-Architektur**, nicht in Vertragsklauseln:

- Fakten aus Handbüchern (Tabellen, Matrizen, Teilelisten) sind frei nutzbar — die geschützte Ausdrucksform nicht.
- Handbücher werden nur durch Nutzer mit Eigentums-/Rechtebestätigung hochgeladen.
- Ablauf: hochladen → Fakten extrahieren → **Quelldatei serverseitig löschen**.
- Referenzen auf Einzelnutzer-Ebene, nicht auf Club-Ebene.

## Mitmachen

Das Projekt entsteht in der Gruppe „KI meets Pinball". Es gibt Live-„Driver"-Rollen (gemeinsames Bauen) und asynchrone Beiträge (Spec, Tests, Datensammlung, Inhalte). Wer welchen Hut aufhat, klären wir in den Sessions.

## Lizenz

Noch festzulegen.
