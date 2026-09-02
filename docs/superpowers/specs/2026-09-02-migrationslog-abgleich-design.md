# Migrationslog abgleichen: `db:migrate` wieder nutzbar machen

Stand: 2026-09-02. Betrifft die produktive Supabase-Datenbank (`POSTGRES_URL`).
Nichts davon ist ausgeführt — dies ist der Plan zur Freigabe.

## Befund (nur gelesen)

| Was | Ergebnis |
|---|---|
| Journal `drizzle/meta/_journal.json` | 56 Einträge (0000 … 0055) |
| `drizzle.__drizzle_migrations` | 41 Zeilen; alle 41 per SHA-256 des Dateiinhalts einem Journal-Eintrag zugeordnet (0000 … 0040), letzte `created_at` = `when` von 0040 (12. Aug) |
| Nicht verzeichnet | 0041 … 0055 (13. Aug bis heute) |
| Deren Wirkung in der DB | **vollständig vorhanden**: alle Tabellen, Spalten, Enum-Werte, Constraints, Indizes, RLS; 0044 (Rollen-Katalog: Supporter weg, Gast/User da) und die DROPs aus 0046 ebenfalls; 0054/0055 heute von Hand eingespielt |
| Schema-Drift DB ↔ `src/db/schema.ts` | keine: 39/39 Tabellen, Spalten, NOT NULL, Indizes identisch; jede Tabelle hat RLS |

Ursache: Ab dem 13. Aug wurde die produktive DB mit `drizzle-kit push` (oder von
Hand) auf den Schema-Stand gebracht, nicht mit `drizzle-kit migrate`. Push schreibt
keine Zeilen ins Migrationslog.

Warum `npm run db:migrate` seitdem stumm ist (drizzle-orm `pg-core/dialect.js`):
der Migrator nimmt die letzte `created_at` (0040) und führt alle Journal-Einträge
mit späterem `when` **in einer Transaktion** aus. 0041 läuft (nur
`ALTER TYPE … ADD VALUE IF NOT EXISTS` → die NOTICE-Zeilen), 0042 scheitert an
`CREATE TABLE "mail_log"` (existiert), die Transaktion wird zurückgerollt —
drizzle-kit 0.31.10 lässt dann nur den Spinner „applying migrations…" stehen —
die Erfolgszeile „[✓] migrations applied successfully!" erschien in keinem der
Läufe. Ergebnis: nichts angewendet, nichts verzeichnet, keine Fehlermeldung.

## Entscheidung: Log nachführen, nicht Migrationen wiederholen

Die 15 Migrationen dürfen NICHT erneut laufen (Tabellen existieren, 0044 würde
Rollenzuweisungen zweimal löschen — heute wirkungslos, aber falsch im Prinzip).
Stattdessen bekommt das Log genau die 15 Zeilen, die der Migrator selbst
geschrieben hätte: `hash` = SHA-256 des Dateiinhalts, `created_at` = `when` aus
dem Journal. Danach ist `db:migrate` ein echter No-op und funktioniert für alle
künftigen Migrationen wieder.

Verworfen: (a) Migrationstabelle leeren und neu „baselinen" — verliert die Historie
und ist nicht nötig; (b) `db:push` dauerhaft als Produktionsweg — schreibt kein Log,
genau das Problem von heute; (c) die 15 SQL-Dateien idempotent umschreiben und
laufen lassen — Aufwand ohne Nutzen, die Wirkung ist ja da.

## Stand (2026-09-02) — ausgeführt

- Schritte 1–3 auf der E2E-DB durchgespielt: 56 ausstehend → `db:reconcile --apply`
  → 56 verzeichnet → `db:migrate` zeigt erstmals „[✓] migrations applied
  successfully!" → `db:status` 0 ausstehend.
- Zwei Erkenntnisse aus der Probe, beide im Skript berücksichtigt: (a) die per
  `push` befüllte E2E-DB hatte KEIN RLS (push kennt die RLS-Statements der
  Migrationen nicht) — eingeschaltet, wie produktiv; (b) der Prüfer prüft gegen den
  ENDZUSTAND: ein Objekt aus Migration N darf fehlen, wenn eine spätere (oder
  dieselbe) Migration es wieder entfernt, und umgekehrt.
- Produktion (Schritt 4): `db:status` 15 ausstehend → Vorschau 15 × ok →
  `--apply` 15 eingetragen → `db:migrate` „[✓] migrations applied successfully!"
  → `db:status` 56 verzeichnet, 0 ausstehend.

## Schritte

1. **Status-Skript** `scripts/migrate-status.mjs` (nur lesen): bildet die Auswahl
   des Migrators nach — Journal gegen `drizzle.__drizzle_migrations` (Hash + `when`)
   — und druckt: verzeichnet / ausstehend / ohne Journal-Gegenstück. npm-Skript
   `db:status`. Das ist der Schutz gegen die stumme Variante: vor und nach jedem
   `db:migrate` einmal `db:status`.
2. **Abgleich-Skript** `scripts/migrate-reconcile.mjs`: für jeden ausstehenden
   Journal-Eintrag prüfen, dass seine Objekte existieren (dieselbe Prüfung wie
   im Befund: Tabellen, Spalten, Indizes, Typen, Enum-Werte, Constraints, RLS);
   nur wenn ALLE prüfbaren Prüfungen bestehen, die Log-Zeile einfügen. Läuft in
   einer Transaktion; ohne `--apply` nur Vorschau. Für Daten-Migrationen ohne DDL
   (0044, 0055) wird die Wirkung per gezielter Abfrage geprüft (Rollen-Keys,
   `opdb_machine_ref` gefüllt UND Relink vollzogen). Anweisungen, die weder DDL
   noch eine hinterlegte Datenprüfung sind (Backfills älterer Migrationen),
   meldet das Skript als „ungeprüft" — sie blockieren nicht, stehen aber im
   Bericht; wer sie absichern will, ergänzt einen `DATENPRUEFER`-Eintrag.
3. **Probe auf der E2E-Datenbank** (Docker `pinball-e2e`, per `push` befüllt, hat
   dieselbe Situation: Schema da, Log leer): `db:status` → 56 ausstehend;
   `migrate-reconcile --apply` → 56 verzeichnet; `db:migrate` → No-op, Exit 0;
   `db:status` → 0 ausstehend. Damit ist der Mechanismus vor der Produktion
   einmal komplett durchgespielt.
4. **Produktion**: `db:status` (erwartet 15 ausstehend) → `migrate-reconcile`
   Vorschau → Freigabe → `--apply` → `db:migrate` (No-op) → `db:status` (0).
   Rückweg: `DELETE FROM drizzle.__drizzle_migrations WHERE created_at > <when 0040>`.
   Supabase-Backup ist unabhängig davon vorhanden.
5. **Dokumentation**: CLAUDE.md-Abschnitt zu Migrationen ergänzen — produktiv
   NUR `db:migrate` (+ `db:status` davor/danach), `db:push` NUR für die E2E-DB;
   `db:migrate` ist bei Fehlern stumm, `db:status` zeigt die Wahrheit. README
   „Umgebungsvariablen/DB" entsprechend.

## Verifikation

- Schritt 3 vollständig grün auf der E2E-DB (Ausgaben im Bericht).
- Produktion nach Schritt 4: `db:status` = 0 ausstehend, `SELECT count(*)` = 56,
  App unverändert (keine Schemaänderung findet statt).
- Kein Commit ohne Anweisung.
