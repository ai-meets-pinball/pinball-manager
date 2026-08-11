# TODO / Backlog

Zurückgestellte und offene Bausteine. Der Kern des Datenmodell-Redesigns
(Generation → Modell → Flipper, `knowledge` + Sichtbarkeit, Generation-Resolver,
`repair_faults`, Community-Signale/Ausblenden/Melde-Warnung) ist umgesetzt und
auf `main`. Ebenfalls umgesetzt (08/2026): **Kuratoren-Moderation** (globale
Rolle `kurator`, Verbergen mit Pflicht-Begründung, Seite `/kuratierung`;
Melde-Warnung bleibt rein anzeigend) und **In-Place-Editor + Bearbeitungs-
Verlauf** (`knowledge_revisions`; Neu-Generierung/Import aktualisiert in place —
id und Signale bleiben erhalten).

## Offen, aber aktuell geringer Nutzen

- **Fork** (`knowledge_overrides` `typ='fork'` + vorhandenes
  `knowledge.forked_from_id`): einen fremden Eintrag als eigenen übernehmen.
  *Bewusst zurückgestellt (Entscheidung 2026-07-31).* Mit dem vorhandenen
  Editor inzwischen günstiger zu bauen; Bedarf abwarten.
- **Revision wiederherstellen**: der Verlauf ist ansehen-only (v1). Restore wäre
  ein kleiner Folgeschritt: aktuellen Stand als Revision sichern + UPDATE mit
  den Revisionsdaten („Wiederhergestellt aus Verlauf").

## Architektur-Review 08/2026 — offene Punkte

Der Review vom 10.08.2026 hat sechs Kandidaten ergeben; alle sind umgesetzt und
auf `main` (Fälligkeit, Betriebsstatus, `getMachineDetail`, KI-Anbieter-Seam,
gemeinsame Prüfkette für KI- und Einfüge-Pfad, reine Rechte-Regeln). Nachgezogen
wurden außerdem die Autorisierung in `db/queries/`, der Status-Trichter und die
Aufteilung von `queries.ts` nach Themen.

**Noch zu tun:**

- **Lauf mit echtem Modell.** Der einzige ungeprüfte Teil: ob Claude/Ollama/MLX
  die Prompts schemakonform beantworten. Alles drumherum ist abgedeckt
  (`manual-extract.integration.test.ts` fährt die Kette mit echtem PDF und
  gefälschtem Modell). Von Hand zu prüfen: Handbuch-Upload mit `anthropic` und
  mit `auto` (Eskalation), Guide erzeugen (Websuche, `pause_turn`),
  Wartungsplan-Import — bei Bedarf zusätzlich mit `AI_PROVIDER=ollama`.

**Bewusst nicht gebaut:**

- **`formAction`-Wrapper** (`FormState` als Union mit `code`, plus ein Wrapper,
  der geworfene Gates in Werte übersetzt). *Entscheidung 2026-08-11.* Die
  Oberfläche riegelt an 15 Stellen über `darf` ab, bevor eine Aktion angeboten
  wird, und sechs E2E-Tests belegen das — ein geworfenes „darfst du nicht"
  erreicht nur, wer die UI umgeht, und dafür ist eine Error-Boundary die
  richtige Antwort. Die wertvolle Hälfte (stille Verweigerungen beseitigen) ist
  bereits umgesetzt. Wer es doch baut: `redirect()` wirft intern, ein Catch-All
  muss mit `unstable_rethrow` schützen.
- **Autorisierungs-Parameter für `getMachineFaults`, `getLetzteWartung`,
  `getNeueFehlerSeitGestern`, `getMaintenanceTasks`, `getRepairShares`.** Ihr
  einziger Aufrufer ist `getMachineDetail`, das `requireMachineAccess` schon
  ausgeführt hat und dieselbe ID weiterreicht — ein Parameter wäre dort
  Zeremonie plus eine zweite Autorisierungsabfrage je Aufruf.

## Phase-3-Rest (bewusst zurückgestellt)

- **`derived_knowledge_id`** — eine Reparatur zu teilbarem Wissen „befördern".
  Reparatur-Sharing bleibt laut Entscheidung in `shares`/`share_targets` (mit
  Kosten-Projektion + Anonymität), es wird **nicht** nach `knowledge` migriert.
