# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Phase 1 (MVP) scaffolded and implemented.** The Next.js app exists with auth, machine CRUD, fault tracking, repair history, clubs/memberships, and search/filter. Data access is **Drizzle ORM** ([src/db/schema.ts](src/db/schema.ts)); auth is **Better Auth** ([src/lib/auth.ts](src/lib/auth.ts)). Runtime needs a Supabase Postgres + a public Storage bucket `machine-photos` (see README).

The product is a repair/management database for pinball machines (German-language domain: *Maschinen* = machines, *Fehler* = faults, *Reparaturen* = repairs). It doubles as a teaching example for the "KI meets Pinball" group, so **readability and visible architecture are valued over scalability** (PRD §8).

**[CONTEXT.md](CONTEXT.md) is the glossary** — it fixes what the things are called (Maschine, Fehler, Betriebsstatus, Geltungsbereich, Sichtbarkeit …) and which words to avoid. Read it before naming anything new. Domain concepts get German names, infrastructure without domain meaning stays English.

**Rules live in pure modules, I/O calls them.** The pattern to follow when adding logic: the decision goes in a `lib/` module with no DB and no `headers()` — [rechte.ts](src/lib/rechte.ts) (authorization), [faelligkeit.ts](src/lib/faelligkeit.ts) (maintenance due dates), [betriebsstatus.ts](src/lib/betriebsstatus.ts) (operational status), [ai/generate.ts](src/lib/ai/generate.ts) (the AI provider seam). The action or query loads the row and calls the rule. That is what makes the rules unit-testable and readable; putting a decision into a SQL `WHERE` clause or a server action hides it.

## Commands

```bash
npm install                  # install dependencies
cp .env.example .env.local   # then fill in values (see README "Umgebungsvariablen")
npm run db:migrate           # write schema to the DB (or: npm run db:push)
npm run dev                  # dev server on http://localhost:3100 (Next.js 16 + Turbopack)
npm run build                # production build (used to verify changes)
npm run db:generate          # regenerate SQL migrations after editing src/db/schema.ts
npm run db:status            # was ist verzeichnet, was würde db:migrate tun? VOR und NACH db:migrate
npm run db:reconcile         # Migrationslog nachführen (Vorschau; --apply trägt ein) — nur nach db:push-Altlast

# Unit-Tests (Vitest) — nur die REINEN Regeln, ohne DB und ohne Browser
npm test                     # einmal durchlaufen
npm run test:watch           # während der Arbeit

# E2E (Playwright) — läuft gegen eine EIGENE Test-DB, nie gegen die produktive
npm run e2e:install          # Chromium holen — auch NACH jedem npm install nötig,
                             # das @playwright/test anhebt (sonst: „Executable doesn't exist")
npm run e2e                  # Suite starten (Test-Server auf Port 3101)
npm run e2e:ui               # interaktiv
```

App runs on http://localhost:3100.

> **E2E-Setup:** `E2E_DATABASE_URL` in `.env.local` setzen (**zweite** Datenbank!). Lokal z. B.
> `docker run -d --name pinball-e2e -e POSTGRES_PASSWORD=e2e -p 5433:5432 postgres:16`.
> Schema einspielen mit **`push`**, nicht `migrate`:
> `DATABASE_URL="$E2E_DATABASE_URL" npx drizzle-kit push --force` — `drizzle-kit migrate`
> wendet auf einer **frischen** DB nichts an und meldet trotzdem Erfolg (siehe unten).
> Danach den `roles`-Katalog seeden (superadmin/owner/admin/member), sonst bricht das
> Global-Setup mit einer klaren Meldung ab. Zeigt `E2E_DATABASE_URL` auf dieselbe DB wie
> `POSTGRES_URL`, brechen die Tests ab.
>
> **Achtung:** Next 16 lässt pro Verzeichnis nur EINEN Dev-Server zu — vor `npm run e2e`
> muss ein laufendes `npm run dev` beendet werden. **Es gibt bewusst keinen Auth-Bypass:** die
> Testkonten entstehen über den regulären Einladungs-/Sign-up-Pfad und melden sich über
> den echten Login an — ein Bypass würde an genau der Rechtelogik vorbeitesten, die
> abgesichert werden soll.

> **Migrationen produktiv:** NUR `db:migrate`, eingerahmt von `db:status`. `drizzle-kit migrate`
> ist bei einem Fehler STUMM — es zeigt nur den Spinner, keine Fehlermeldung, und rollt alles zurück;
> die Erfolgszeile „[✓] migrations applied successfully!" ist der einzige Beleg. `db:push` nur für die
> E2E-DB: es schreibt kein Log, und danach versucht `db:migrate` alles seit dem letzten Log-Eintrag
> erneut (→ „existiert bereits" → stumm zurückgerollt). Genau das war am 2026-09-02 der Fall (Log bei
> 0040, Schema bei 0055); `db:reconcile` hat das Log nachgeführt, ohne Migrationen zu wiederholen
> (Plan: docs/superpowers/specs/2026-09-02-migrationslog-abgleich-design.md).

> Note: this project uses **Next.js 16** (App Router, Turbopack). The request-routing edge file is `src/proxy.ts` (Next 16 renamed `middleware` → `proxy`).

## Tech stack (decided — do not substitute without discussion)

- **Next.js** with Turbopack, React 19, Node 20+
- **Better Auth** for authentication — TS config is intentionally visible/readable
- **Tailwind CSS v4** (CSS-first config) + Lucide React icons
- **Supabase used as Postgres + Storage only** — not as an auth or API layer
- **AI provider is switchable** (`AI_PROVIDER`): **Anthropic Claude is the default**; an optional **local Ollama** path (code in [src/lib/ai/](src/lib/ai/)) covers the three AI features for local/self-hosted runs (never on Vercel — `localhost` is unreachable there). Ollama is an *addition*, not a substitution of the stack.
- **Vercel** deployment; **light "editorial" theme** with a burgundy accent (from a Claude Design handoff v2; light default + dark variant, toggle in nav; tokens/fonts in [src/app/globals.css](src/app/globals.css); logo/favicons from the handoff's brand assets); mobile-friendly (repairs happen at the machine)

## Architectural constraints (the important "why")

These are deliberate decisions, not omissions — preserve them:

1. **Authorization lives in the app layer, not the database.** Do **not** add Supabase Row-Level Security *policies*. Access control is enforced in TypeScript so it stays visible and teachable (PRD §3, §7). Supabase is treated as a plain Postgres + Storage backend.
   - **But: RLS is ENABLED (without any policies) on every table** since migration `0032` — solely to slam the door on Supabase's public PostgREST Data API (`/rest/v1/`), which would otherwise expose all tables to anyone with the anon key, bypassing the app entirely. No policies = deny-all for the API; the app is unaffected because it connects as the table owner. **Every NEW table's migration must include `ALTER TABLE "<name>" ENABLE ROW LEVEL SECURITY;`** or the Supabase security linter errors return.

2. **Manual upload handling is intentional** — there is no "we don't look" model. The legal protection is the *pipeline architecture*, not contract clauses (PRD §6).

3. **Manual / OCR pipeline must delete source PDFs (Phase 2).** When implementing manual upload: a user uploads their own manual + confirms ownership (attestation) → server extracts fact tables (solenoid tables, switch matrix, parts lists) via OCR → **the source PDF is deleted server-side**. Only the extracted *facts* are persisted; the copyrighted expression of the manual is never stored. Manual references are kept at the individual-user level, not the club level.

4. **Faults and repairs are separate concerns.** A fault (`faults`) can exist with no repair attached. The *symptom* lives on the fault, never duplicated onto the repair. A repair (`repairs`) may link to one or more faults; when a repair resolves a fault, set that fault's status to "behoben" (resolved). See PRD §4.2–4.3.

## Data model (planned — PRD §5)

- `users` (Better Auth)
- `clubs` / `memberships` (optional in MVP, likely Phase 2)
- `machines` (owner/club, hersteller, modell, baujahr, opdb_ref, ipdb_ref, foto_url)
- `faults` (machine_id, datum, beschreibung, kategorie, prioritaet, status, gemeldet_von)
- `repairs` (machine_id, fault_id [optional], datum, diagnose, massnahme, teile, kosten, zeit, status)
- `machine_data` (machine_id, typ [solenoids/switches/parts], daten JSON) — populated by extraction

## Roadmap phasing

- **Phase 1 (MVP):** Auth, machine CRUD, fault tracking, repair history, search/filter.
- **Phase 2:** Manual upload + fact extraction + service-console-style display. **Partially implemented:** per-machine manual (PDF) upload → a model **extracts fact tables** (coils/switches/lamps/fuses/parts/rules) → stored as **model-level `knowledge`** (not `machine_data` — see the data-model redesign), rendered as tables. **Copyright pipeline is load-bearing:** attestation required, the PDF is held **in memory only and never persisted** (no Storage bucket, `serverActions.bodySizeLimit` raised for the upload), only extracted facts are stored. `manual-extract.integration.test.ts` pins that invariant.
  - **All three AI features go through one seam:** [src/lib/ai/generate.ts](src/lib/ai/generate.ts) (`generateJson`) with four adapters — anthropic, ollama, mlx, plus a scripted one for tests. `@anthropic-ai/sdk` is touched in [src/lib/ai/anthropic.ts](src/lib/ai/anthropic.ts) and nowhere else. **Do not add `if (provider === …)` to a feature** — that ladder was removed on purpose; extend the seam or the adapter instead.
  - PDFs are turned into what a provider can read by [src/lib/ai/prepare-document.ts](src/lib/ai/prepare-document.ts) (Claude: native PDF packets; Ollama: text or page images; MLX: OCR first). Packets load lazily so a 400-page scan does not blow up memory.
  - Claude is the default (`ANTHROPIC_API_KEY`); `AI_PROVIDER=ollama|mlx` runs everything locally. Web search only exists on Claude — callers ask for it with `websuche: true` and read back `antwort.websucheGenutzt`, which is stored so the lower reliability stays visible.
- **Phase 3:** AI fault diagnosis (text), image-based component recognition (vision), club features. (Claude is now the chosen model family — see Phase 2.)

Build Phase 1 features only unless explicitly directed to later phases.
