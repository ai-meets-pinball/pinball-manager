# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Phase 1 (MVP) scaffolded and implemented.** The Next.js app exists with auth, machine CRUD, fault tracking, repair history, clubs/memberships, and search/filter. Data access is **Drizzle ORM** ([src/db/schema.ts](src/db/schema.ts)); auth is **Better Auth** ([src/lib/auth.ts](src/lib/auth.ts)); app-layer authorization lives in [src/lib/session.ts](src/lib/session.ts). Runtime needs a Supabase Postgres + a public Storage bucket `machine-photos` (see README).

The product is a repair/management database for pinball machines (German-language domain: *Maschinen* = machines, *Fehler* = faults, *Reparaturen* = repairs). It doubles as a teaching example for the "KI meets Pinball" group, so **readability and visible architecture are valued over scalability** (PRD §8).

## Commands

```bash
npm install                  # install dependencies
cp .env.example .env.local   # then fill in values (see README "Umgebungsvariablen")
npm run db:migrate           # write schema to the DB (or: npm run db:push)
npm run dev                  # dev server on http://localhost:3000 (Next.js 16 + Turbopack)
npm run build                # production build (used to verify changes)
npm run db:generate          # regenerate SQL migrations after editing src/db/schema.ts
```

App runs on http://localhost:3000.

> Note: this project uses **Next.js 16** (App Router, Turbopack). The request-routing edge file is `src/proxy.ts` (Next 16 renamed `middleware` → `proxy`).

## Tech stack (decided — do not substitute without discussion)

- **Next.js** with Turbopack, React 19, Node 20+
- **Better Auth** for authentication — TS config is intentionally visible/readable
- **Tailwind CSS v4** (CSS-first config) + Lucide React icons
- **Supabase used as Postgres + Storage only** — not as an auth or API layer
- **Vercel** deployment; **light "editorial" theme** with a burgundy accent (from a Claude Design handoff v2; light default + dark variant, toggle in nav; tokens/fonts in [src/app/globals.css](src/app/globals.css); logo/favicons from the handoff's brand assets); mobile-friendly (repairs happen at the machine)

## Architectural constraints (the important "why")

These are deliberate decisions, not omissions — preserve them:

1. **Authorization lives in the app layer, not the database.** Do **not** add Supabase Row-Level Security. Access control is enforced in TypeScript so it stays visible and teachable (PRD §3, §7). Supabase is treated as a plain Postgres + Storage backend.

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
- **Phase 2:** Manual upload + OCR fact extraction + WPC-service-console-style display of facts.
- **Phase 3:** AI fault diagnosis (text), image-based component recognition (vision), club features. The AI model is not yet chosen (PRD §11).

Build Phase 1 features only unless explicitly directed to later phases.
