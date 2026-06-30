# PRD – Pinball Manager
**Reparatur- und Verwaltungsdatenbank für Flipperautomaten**

Version 0.2 (Entwurf) · 30.06.2026
Status: Entwurf zur Diskussion

---

## 1. Kurzbeschreibung
Pinball Manager ist eine Web-Anwendung, mit der einzelne Sammler und Clubs ihre Flipperautomaten verwalten, Reparaturen dokumentieren und Fehler KI-gestützt diagnostizieren können. Faktische Daten aus Handbüchern (Solenoid-Tabellen, Switch-Matrix, Teilelisten) werden strukturiert nutzbar gemacht — die urheberrechtlich geschützte Ausdrucksform der Handbücher selbst wird nicht gespeichert.

## 2. Problem & Zielgruppe
- Reparaturwissen ist verstreut: Handbücher als PDF, Forenposts, Erfahrungswissen im Kopf.
- Bei der Fehlersuche fehlt der schnelle Zugriff auf maschinenspezifische Fakten (welcher Solenoid, welche Switch-Nummer, welches Ersatzteil).
- Reparaturhistorie wird selten dokumentiert → dieselben Fehler werden mehrfach mühsam diagnostiziert.

**Zielgruppen**
- **Einzelsammler**: 1–10 Maschinen, will Überblick + Reparaturgedächtnis.
- **Clubs/Vereine**: viele Maschinen, mehrere Personen, gemeinsame Historie.

## 3. Ziele & Nicht-Ziele
**Ziele (MVP)**
- Maschinen anlegen und verwalten.
- Fehler an einer Maschine erfassen und nachverfolgen.
- Reparaturen pro Maschine dokumentieren und durchsuchen.
- Schnell deploybar, sichtbar, erweiterbar — als Lehrbeispiel für „KI meets Pinball".

**Nicht-Ziele (vorerst)**
- Kein Marktplatz, kein Teile-Shop.
- Keine Skalierung auf tausende Nutzer in Phase 1.
- Kein Row-Level-Security-Aufbau (Autorisierung bewusst in der App-Schicht, sichtbar).

## 4. Kernfunktionen

### 4.1 Flipper-Verwaltung (MVP)
- Maschine anlegen: Hersteller, Modell, Baujahr, Seriennummer (optional), Foto.
- Verknüpfung zu OPDB / IPDB über Referenz-ID.
- Liste & Detailansicht; Zuordnung zu Nutzer bzw. Club.

### 4.2 Fehlererfassung (MVP)
- Fehler an einer Maschine erfassen: Datum, Beschreibung/Symptom, Kategorie (z. B. Spule, Schalter, Anzeige, mechanisch), Priorität, Status (offen / in Arbeit / behoben), gemeldet von.
- Ein Fehler kann ohne (noch) zugeordnete Reparatur bestehen — z. B. „läuft erstmal, später beheben".
- Filter & Suche (offene Fehler je Maschine, nach Kategorie/Priorität).
- Bildet die Eingangsbasis für die spätere KI-Fehlerdiagnose (4.5).

### 4.3 Reparaturhistorie (MVP)
- Eintrag pro Reparatur: Datum, Diagnose, durchgeführte Maßnahme, verbaute Teile, Kosten, Zeitaufwand, Status (offen / in Arbeit / erledigt).
- Optional verknüpfbar mit einem oder mehreren erfassten Fehlern (4.2); behebt die Reparatur den Fehler, wird dessen Status auf „behoben" gesetzt.
- Das Symptom liegt am Fehler (4.2), nicht doppelt am Reparatureintrag.
- Filter & Suche (nach Maschine, Status).

### 4.4 Handbuch-Upload & Datenextraktion (Phase 2)
- Nutzer lädt eigenes Handbuch (PDF) hoch + bestätigt Eigentum/Rechte (Attestation).
- Server: Rasterung + OCR extrahiert Faktentabellen.
- **Quell-PDF wird nach Verarbeitung serverseitig gelöscht**; nur extrahierte Faktendaten bleiben gespeichert.
- Anzeige im Stil der WPC-Service-Konsole (vorhandener STTNG-Prototyp als Vorlage).

### 4.5 KI-Fehlerdiagnose (Phase 3)
- Ausgangspunkt ist ein erfasster Fehler (4.2) oder eine freie Symptombeschreibung.
- KI schlägt wahrscheinliche Ursachen + Diagnoseschritte vor, gestützt auf die extrahierten Faktendaten der jeweiligen Maschine.

### 4.6 Bildbasierte Bauteil-Erkennung (Phase 3)
- Nutzer fotografiert ein Bauteil; Vision-Modell identifiziert es und verknüpft mit Teile-/Reparaturinfos.

## 5. Datenmodell (grob)
- **users** (Better Auth)
- **clubs** / **memberships** (optional im MVP, sonst Phase 2)
- **machines** (id, owner/club, hersteller, modell, baujahr, opdb_ref, ipdb_ref, foto_url)
- **faults** (id, machine_id, datum, beschreibung, kategorie, prioritaet, status, gemeldet_von)
- **repairs** (id, machine_id, fault_id [optional], datum, diagnose, massnahme, teile, kosten, zeit, status)
- **machine_data** (id, machine_id, typ [solenoids/switches/parts], daten JSON) — aus Extraktion

## 6. Rechtliche Leitplanken
- Fakten frei nutzbar (Solenoid-Tabellen, Switch-Matrix, Teilelisten); geschützte Ausdrucksform nicht.
- Schutz durch **Pipeline-Architektur**, nicht durch Vertragsklauseln:
  - Uploads nur durch Nutzer mit Eigentums-/Rechtebestätigung.
  - Verarbeiten → extrahieren → Quelldatei serverseitig löschen.
  - Lokale Referenzen auf Einzelnutzer-Ebene, nicht auf Club-Ebene.
- Bewusste Unkenntnis von Uploads verschiebt die Haftung nicht sauber → kein „Wir-schauen-nicht-hin"-Modell.

## 7. Tech-Stack (festgelegt)
- **Framework**: Next.js (Turbopack, React 19, Node 20+)
- **Auth**: Better Auth (sichtbare TS-Konfiguration; App-Layer-Autorisierung statt Supabase RLS)
- **Styling**: Tailwind CSS v4 (CSS-first), Lucide React
- **Daten/Storage**: Supabase als reines Postgres + Storage
- **Deployment**: Vercel
- **Domain**: United Domains
- **KI**: noch zu entscheiden (Vision + Text)

## 8. Nicht-funktionale Anforderungen
- Schnell deploybar (sichtbares Ergebnis in 1–2 Wochen).
- Einfach lesbar/lehrbar — Sichtbarkeit vor Skalierbarkeit.
- Mobiltauglich (Reparatur passiert an der Maschine).
- Light-Theme als Default, Dark-Mode-Toggle.

## 9. Roadmap
- **Phase 1 (MVP)**: Auth, Maschinen-CRUD, Fehlererfassung, Reparaturhistorie, Suche. → Ziel: live in 1–2 Wochen.
- **Phase 2**: Handbuch-Upload + OCR-Extraktion + Faktendaten-Anzeige (Konsolen-Stil).
- **Phase 3**: KI-Fehlerdiagnose, bildbasierte Bauteil-Erkennung, Club-Funktionen.

## 10. Erfolgskriterien
- MVP deployed und über eigene Domain erreichbar.
- Mindestens eine reale Maschine + echte Reparatureinträge erfasst (z. B. STTNG-Testfall).
- Der gesamte Weg PRD → live als nachvollziehbares Lehrbeispiel für die Gruppe dokumentiert.

## 11. Offene Fragen
- Welches KI-Modell für Diagnose und Bilderkennung?
- Club-Funktionen schon in Phase 1 oder erst Phase 3?
- Wie weit reicht die Faktenextraktion automatisch vs. manuell kuratiert?
