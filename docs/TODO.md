# TODO / Backlog

Zurückgestellte und offene Bausteine. Der Kern des Datenmodell-Redesigns
(Generation → Modell → Flipper, `knowledge` + Sichtbarkeit, Generation-Resolver,
`repair_faults`, Community-Signale/Ausblenden/Melde-Warnung) ist umgesetzt und
auf `main`. Ebenfalls umgesetzt (08/2026): **Kuratoren-Moderation** (globale
Rolle `kurator`, Verbergen mit Pflicht-Begründung, Seite `/kuratierung`;
Melde-Warnung bleibt rein anzeigend) und **In-Place-Editor + Bearbeitungs-
Verlauf** (`knowledge_revisions`; Neu-Generierung/Import aktualisiert in place —
id und Signale bleiben erhalten).

## Umgesetzt 09/2026 (Stand 2026-09-10)

- **Redlining-Overlay** eingerichtet (Alt+R → `/redline`); dev-only, im
  Production-Build kein `data-rl`, die Route antwortet dort mit 403. Die
  Playwright-Suite fährt `next dev`, das Overlay ist also mitgeladen — mit
  `npm run e2e` bestätigt: 61 grün, die 6 roten (Kuratierung, Club-Löschen,
  Club-Zuordnung) sind vorbestehend und auch auf sauberem Stand rot.
- **Zugang wieder auf Einladung** (2026-09-11): Selbst-Registrierung ist nicht
  mehr möglich. Alle sechs „Konto erstellen"-Stellen auf Start, Funktionen,
  Preview, Login und /tour zeigen jetzt „Zugang anfragen" (mailto); /register
  zeigt ohne Einladungs-Token kein Formular; `registerAccount()` lehnt ohne
  Einladung ab (Ausnahme: Bootstrap auf leerer Installation). Der rohe
  Better-Auth-Endpunkt ist noch offen — siehe „Offen" unten.
- **/tour** (2026-09-11): englischer One-Pager zum Weitergeben — öffentlich,
  aber NICHT in der Navigation verlinkt und mit `robots: noindex` (Vorbild:
  /log). Zeigt Betrieb zuerst (Inventar, Fehler/Reparaturen, Wartung, QR am
  Gerät mit echtem Etikett- und Scorecard-Beispiel, Turniermodus, KI) und
  benennt in einem eigenen Abschnitt ehrlich, was fehlt. Einzige englische
  Fläche im Repo; eine englische App-Version wäre eine eigene Edition, keine
  Übersetzung.
- **Redlining-Runde 3** (Notiz vom 2026-09-10, 17:08): die Wissensbasis
  (/modelle) ist nach Modell, Baujahr und Generation sortierbar — die dichte
  Ansicht ist dafür eine echte Tabelle mit `SortKopf` geworden (Karten bleiben
  als zweite Ansicht). Die Generation stand dort vorher gar nicht zur
  Verfügung: `getKnowledgeModels` holt sie jetzt per LEFT JOIN, für eine
  Familie zählt die erste Edition, die eine trägt.
- **Redlining-Runde 2** (Notizen vom 2026-09-10, 15:24): Kacheln der Übersicht
  gleich hoch mit oben bündigen Icons; die zwei Sammel-Leisten der
  Maschinenliste zu EINER zusammengefasst, Einstieg ist ein Knopf „Verwalten"
  in der Steuerzeile (Modus lebt in der URL, `?verwalten=1`, bewusst nicht
  gemerkt); die Wissensbasis bekommt einen Karten/Listen-Umschalter (Cookie
  `wissenView`) und startet als Liste; /machines startet ebenfalls als Tabelle.
- **Redlining-Runde 1** (Notizen vom 2026-09-10): Sortierung sitzt im
  Tabellenkopf (`ui/sort-kopf.tsx`, `/machines` + `/admin/modelle`; Select nur
  noch in der Kartenansicht), neue Spalte „Hinzugefügt", einheitliche
  Club-Spalte wird ausgeblendet (`lib/tabelle.ts`), Dashboard startet als
  Liste, fünf Kacheln in einer Zeile, leere Abschnitte weg (mit
  „Alles erledigt"-Zeile), Bereichswahl gilt seitenübergreifend
  (`lib/bereich.ts`, Cookie `bereich` mit `path=/`; `/machines` jetzt
  mehrfach wählbar wie das Dashboard).

- **UX-Konsolidierung** aller Seiten auf ein Muster (kompakte Zeilen, Icon-
  Aktionen, Neu/Ändern im `<dialog>`, Unmögliches ausgegraut mit Grund, Actions
  geben `FormState` zurück statt zu werfen) — Spec mit den bewusst offenen
  Punkten: `docs/superpowers/specs/2026-09-02-ux-konsolidierung-design.md`.
  Offen dort: Prompts-Karte als Ganzes, doppeltes Anbieter-Feld in der
  Prompt-Refinery, Zurück-Link der Modellseite. (Die zwei Sammel-Leisten der
  Maschinenliste sind mit Runde 2 zu einer zusammengefasst.)
- **Modell-Familie**: baugleiche OPDB-Editionen (gleiche ersten zwei Segmente,
  `opdb_machine_ref`) teilen Wissen, Guides, Tipps, Freigaben und Generation,
  ohne dass Katalogzeilen verschmelzen (CONTEXT.md „Familie", Datenmodell §2).
- **Migrationslog** der produktiven DB mit dem Journal abgeglichen (`db:status`,
  `db:reconcile`); Regel: produktiv nur `db:migrate`, `db:push` nur E2E —
  Spec: `docs/superpowers/specs/2026-09-02-migrationslog-abgleich-design.md`.

## Offen, aber aktuell geringer Nutzen

- **Sign-up-Endpunkt schließen.** Seit 2026-09-11 läuft der Zugang über eine
  Einladung: die öffentlichen Seiten werben nicht mehr mit „Konto erstellen",
  /register zeigt ohne Token kein Formular, und `registerAccount()` lehnt ohne
  Einladung ab. **Better Auths eigener Endpunkt `/api/auth/sign-up/email` ist
  aber weiter offen.** `disableSignUp: true` hilft nicht — die Prüfung sitzt im
  Endpunkt-Handler, den `auth.api.signUpEmail()` aus dem Einladungsfluss selbst
  aufruft (im better-auth-Quelltext nachgesehen); der Schalter würde Einladungen
  mit abräumen. Nötig: ein `before`-Hook in `lib/auth.ts`, der ohne
  `claiming`-Einladung ablehnt — und dazu die drei Tests in
  `e2e/registrierung.spec.ts` umschreiben, die heute offenes Sign-up behaupten
  (sie sind das Sicherheitsnetz für den Hook).

- **Review 09/2026 — verbliebene Ermessenspunkte** (Code-Review nach 1.35, Fixes
  in 1.36): der Rollen-Dialog (`admin-user-roles.tsx` ↔ `member-actions.tsx`) und
  der Umbenennen-Dialog (`plan-header.tsx` ↔ `generation-row.tsx`) sind je zweimal
  gebaut; der Freigabe-Entwurf `{scope, anonym, zeigeKosten, clubIds, emails}` ist
  viermal typisiert (`lib/sharing.FreigabeEntwurf` sollte die eine Quelle sein);
  Dialoge schließen teils bei `state.ok`, teils bei `state.message`; `ROLE_LABEL`
  in `status-badge.tsx` trägt längst alle Status-Labels und heißt noch nach den
  Rollen. Alles ohne Verhaltensänderung — beim nächsten Anfassen der Stellen
  mitnehmen.

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
  der geworfene Gates in Werte übersetzt). *Entscheidung 2026-08-11, präzisiert
  2026-09-02:* FACHREGELN (letzter Owner, Standard-verwaltet, Platzhalter …)
  geben seit der UX-Konsolidierung `FormState` zurück und laufen über
  `ui/action-form.tsx`; nur AUTH-Gates (`darf*`, `require*`) werfen weiter —
  genau die Trennung, die hier gemeint war. Die
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
