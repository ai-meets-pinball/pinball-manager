# TODO / Backlog

Zurückgestellte und offene Bausteine. Der Kern des Datenmodell-Redesigns
(Generation → Modell → Flipper, `knowledge` + Sichtbarkeit, Generation-Resolver,
`repair_faults`, Community-Signale/Ausblenden/Melde-Warnung) ist umgesetzt und
auf `main`.

## Zurückgestellt (bewusste Entscheidung)

- **Kuratoren-Moderation** — *zurückgestellt am 2026-07-30.*
  Eine globale Rolle, die Wissenseinträge **für alle** verbergen kann. Vor dem
  Bau zu klären (Governance):
  - Wer wird Kurator — Vergabe über `/admin` wie die „Supporter"-Rolle?
  - Dürfen Kuratoren global verbergen — mit Begründung und umkehrbar?
  - Sehen Kuratoren/Super-Admins verborgene Einträge weiterhin (markiert), um sie
    wiederherzustellen?
  - Verhältnis zur bestehenden **Melde-Warnung** (`KnowledgeGemeldet`, ab 2×
    „falsch"): bleibt sie rein anzeigend, oder wird ab einem Schwellwert
    automatisch verborgen?
  - Umsetzung dann etwa: Rolle `kurator` (Katalog wie `0012` für Supporter),
    `knowledge.verborgen`/`verborgen_von`, Lesepfad filtert Verborgenes für
    Nicht-Kuratoren, Aktion + UI, `/admin`-Vergabe, E2E.

## Offen, aber aktuell geringer Nutzen

- **Fork** (`knowledge_overrides` `typ='fork'` + vorhandenes
  `knowledge.forked_from_id`): einen fremden Eintrag als eigenen übernehmen.
  Bringt wenig ohne **Inhalt-Editor** (Fakten/Guides werden beim Neu-Erzeugen
  ohnehin ersetzt).
- **`knowledge_revisions`** (Bearbeitungs-Historie): mangels In-Place-Edit
  erfasst das nur Neu-Erzeugungen; die Eintrags-id wechselt dabei → begrenzter
  Wert bis es einen Editor gibt.

## Phase-3-Rest (bewusst zurückgestellt)

- **`derived_knowledge_id`** — eine Reparatur zu teilbarem Wissen „befördern".
  Reparatur-Sharing bleibt laut Entscheidung in `shares`/`share_targets` (mit
  Kosten-Projektion + Anonymität), es wird **nicht** nach `knowledge` migriert.
