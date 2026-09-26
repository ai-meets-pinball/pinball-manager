# TODO / Backlog

Zurückgestellte und offene Bausteine. Der Kern des Datenmodell-Redesigns
(Generation → Modell → Flipper, `knowledge` + Sichtbarkeit, Generation-Resolver,
`repair_faults`, Community-Signale/Ausblenden/Melde-Warnung) ist umgesetzt und
auf `main`. Ebenfalls umgesetzt (08/2026): **Kuratoren-Moderation** (globale
Rolle `kurator`, Verbergen mit Pflicht-Begründung, Seite `/kuratierung`;
Melde-Warnung bleibt rein anzeigend) und **In-Place-Editor + Bearbeitungs-
Verlauf** (`knowledge_revisions`; Neu-Generierung/Import aktualisiert in place —
id und Signale bleiben erhalten).

## Umgesetzt 09/2026 (Stand 2026-09-26)

- **Sofortiges Warte-Feedback** (Frank, 26.09.): EIN `Spinner`-Baustein
  (`ui/spinner.tsx`); `Button` ist jetzt Client-Komponente und erkennt per
  `useFormStatus` selbst, wenn sein Formular läuft (Kinder unsichtbar, Spinner
  zentriert, `aria-busy`) — gilt damit auch für Server-`<form action>` und
  `ActionForm`; `pending`-Prop für Buttons außerhalb eines Formulars;
  `IconSubmit` für Icon-Submits; `ConfirmButton` zeigt den Spinner am Auslöser
  in der Zeile. Navigation: `loading.tsx` in (app), help, s, m, invite.
  `SearchToolbar` läuft über `next/form` (Client-Navigation statt Vollreload).
  Bestand aufgeräumt: 22 Inline-`Loader2` und 47 Label-Wechsel („Speichern…",
  nacktes „…") entfernt, Labels sind konstant; lange KI-Aktionen zeigen den
  Dauer-Hinweis neben statt im Knopf.

- **Feedback-Runde 26.09.** (Dirk, Kai): Listen-Vorschauen passen das Foto ins
  einheitliche Quadrat ein statt zu beschneiden; Besitzer-Katalog je Club auf
  der Club-Seite pflegbar (umbenennen, mit Mitglied verknüpfen, zusammenführen,
  löschen ohne Maschinen — Regeln in `lib/besitzer.ts`, Actions in
  `db/actions/besitzer.ts`), verknüpfte Besitzer zeigen den Live-Kontonamen,
  Picker zeigt jede Person genau einmal; „Gemeldet von" beim Fehler-Bearbeiten
  wählbar (Mitglied oder Gast, Scope-Check in `updateFault`); offene Fehler auf
  der Übersicht nach Priorität mit Umschalter „Neueste" (`lib/fehler-sortierung.ts`).

- **Nutzungsübersicht** (`/admin/nutzung`, Super-Admin): je Nutzer (Clubs,
  Maschinen, Fehler, Reparaturen, Wissen, Feedback, KI, Logins, aktive Tage,
  zuletzt gesehen), je Club, und ein Ereignis-Feed als UNION über die
  Fachtabellen (`db/queries/nutzung.ts`, rückwirkend gefüllt). Neu
  protokolliert (Migration 0061, RLS): `login_log` (Better-Auth-Hook
  `session.create.after`, Gerätetyp aus `lib/geraetetyp.ts`, keine IP) und
  `nutzung_tage` (ein Eintrag je Nutzer und UTC-Tag, gesetzt in
  `getCurrentUser`, das jetzt per `React.cache` je Request nur einmal lädt).
  Regeln in `lib/nutzung.ts`; Datenschutzerklärung und Admin-Hilfe ergänzt.

- **Feedback-Runde 23.09.** (fünf Vorschläge von Dirk): Fehler-Mail an den
  Eigentümer PRIVATER Maschinen bei Fremd-/Gast-Meldung (`lib/fehler-mail.ts`
  = Regel mit 30-Minuten-Sperre je Gerät aus `faults` berechnet,
  `db/fehler-mail-benachrichtigung.ts`, Mail-Kategorie `fehler_neu`; Clubs
  bleiben bei WhatsApp); manueller Status-Grund bleibt bei »Spielbereit« als
  Hinweis sichtbar (Status-Karte, Dashboard-Sektion »Betriebsstatus &
  Hinweise«); Dashboard-Zeilen einheitlich Gerät fett/Beschreibung darunter
  (`ListRow subtitleWrap`); Fehler-Kategorien erweitert (Beleuchtung, Elektrik,
  Elektronik, Mechanik, Baugruppe, Software; Bestand »mechanisch« → »Mechanik«
  per SQL); Initialen-Hinweis (drei Buchstaben gingen schon).

- **Heighway Alien (Dirk, 21.09.)**: `scripts/review-zu-fakten.mjs` formt sein
  angereichertes Review-JSON (Top-Level `sections`, Objekt-Records) in das
  Fakten-Import-JSON um — neu darin LED-Ketten (Board/Kette statt Matrix),
  Gummis, Schrauben, Boards/Firmware, 3D-Druckteile; Prosa-Kapitel bleiben
  draußen (gehören in den Guide, als Folgeschritt angeboten). Katalog-
  Korrekturen, die den OPDB-Import überleben: `scripts/opdb-korrekturen.json`
  (erster Eintrag: „Alien (Pro)" → „Alien (Standard)", Heighway hatte nur
  Standard und LE), angewandt nach dem Upsert in `import-opdb.mjs`.

- **Feedback-Runde 19.09.** (acht offene Meldungen, Plan
  `~/.claude/plans/wir-haben-neues-feedback-floofy-parnas.md`): Katalog-Import
  nimmt jetzt auch OPDB-Aliase (Editionen) mit — die „Kiss | Bally"-Zeile mit
  Elvira-Bild war ein Alt-Seed mit falscher OPDB-Id; Foto-Feld mit Format-/
  Größen-Hinweis und Vorab-Prüfung (`lib/bild-upload.ts`), Detail-Kopf zeigt
  das Foto ganz; Sammel-QR-Liste nach Modell sortiert + Suchfeld ab sechs
  Geräten; QR-Bogen „Alle meine Maschinen hinzufügen"; Hilfe-Suche
  (`lib/hilfe-suche.ts`, `?q=` auf /help, Treffer aus Einstieg/Admin verlinkt);
  Maschinen-Karten und -Tabelle zeigen offene Fehler mit neuester Beschreibung;
  Ausstattung alphabetisch; Guide-Import entfernt Zitier-Reste externer
  Modelle (`bereinigeZitate`), Plattform-Prompt auf ein bis zwei Sätze.

- **Einladungs-Rundmail** (2026-09-13, `/admin/rundmail`): Frank schreibt
  Onboarding-/Einladungsmails selbst in der App und verschickt sie an mehrere
  Adressen auf einmal, jede mit eigenem Registrierungslink. Der Text ist die
  Vorlage `invite_platform` (Standard = Onboarding-Text aus
  `docs/onboarding-email-friendly-users.md`, Klartext; `textToHtml` verlinkt
  jetzt http(s)-URLs, escaped bleibt alles), Vorschau über denselben Renderer
  wie der Versand (`renderPlatformInvitation`), Testmail an sich selbst,
  Adressliste über `lib/adressen.ts` (Zeile/Komma/Semikolon, dedupliziert,
  max. 50), Kern `ladePlattformNutzerEin` für Einzel- und Mehrfach-Einladung,
  Ergebnis je Adresse. Bewusst kein HTML-/Markdown-Editor und keine Rundmail
  an bestehende Nutzer (andere Empfängerquelle — bei Bedarf eigene Entscheidung).
- **Redlining-Overlay** eingerichtet (Alt+R → `/redline`); dev-only, im
  Production-Build kein `data-rl`, die Route antwortet dort mit 403. Die
  Playwright-Suite fährt `next dev`, das Overlay ist also mitgeladen — mit
  `npm run e2e` bestätigt, es stört nicht.
- **E2E-Suite wieder komplett grün** (2026-09-12, 70 Tests): sechs Specs waren
  seit der UX-Konsolidierung (562c1a3) rot — reine Test-Drift, kein App-Fehler
  („Für alle verbergen" und das Club-Select sind jetzt `disabled`, die
  Löschfrage und ein Label haben neuen Wortlaut, Club-Löschen bleibt auf
  `/admin/clubs`). Dazu `actionTimeout: 10_000` in `playwright.config.ts`,
  damit ein stale Selektor im Test selbst scheitert statt den Worker neu zu
  starten und Folgetests mitzureißen. Neu: `e2e/umbenennen.spec.ts` (Plan-
  und Generations-Umbenennung, Konfliktfall behält die Eingabe) — der Spec fand
  einen echten Fehler: `ActionDialog` warf nach einer Revalidierung
  `showModal()` „already open as a non-modal dialog" (Knoten wird umgehängt,
  `open` bleibt stehen); behoben per `removeAttribute("open")`, bewusst NICHT
  per `close()` (feuert das close-Event → Dialog unmontiert sich sofort).
- **Code-Review + Security-Audit** (2026-09-13, vier parallele Prüfer über
  den Diff seit `c68a8f3` und das ganze Repo): keine harten Standard-
  Verstöße, keine Autorisierungslücke (alle 29 Action-Dateien und Routen mit
  Gate, kein IDOR, Token 192 Bit, Sign-up per Hook zu, Cron `timingSafeEqual`,
  Uploads per Magic Bytes, SQL parametrisiert, RLS überall). Behoben:
  (1) **Rate-Limit** für den KI-Reparaturvorschlag — Tabelle `ki_aufrufe`
  (Migration 0060, RLS), Regel `lib/ki-limit.ts` (20 je 60 Min. je Nutzer,
  Super-Admin ausgenommen); (2) **Prompt-Injection**: `lib/prompt-sicher.ts`
  — kurze Felder einzeilig/gekappt (Hersteller/Modell stehen im System-Prompt
  des Guides; Validator max 80), lange Felder (Symptom, Wissen, Guide-Text)
  als gerahmte Datenblöcke mit „keine Anweisungen"-Ansage, override-fest, weil
  im Wert statt in der Vorlage; (3) **PDF-Signatur** (`%PDF`) statt
  `file.type` in der Handbuch-Pipeline; (4) `getKiZugang(user)` bündelt die
  dreifach wiederholte Regel-Auswertung. HSTS liefert Vercel bereits
  (`max-age=63072000`); `includeSubDomains/preload` bewusst nicht gesetzt.
- **PDF-Handbuch** (2026-09-13): jedes Kapitel beginnt auf einer neuen Seite,
  Fließtext 10 pt statt 11, und die Wort-Bild-Marke steht oben auf der
  Titelseite — als Vektor nachgezeichnet (`zeichneLogo` in
  `lib/manual-pdf.ts`, dieselben Formen wie `components/logo.tsx`), also ohne
  Bild-Asset und scharf in jeder Größe.
- **Standardvorlage** (2026-09-13): der Wartungs-Vorlage heißt jetzt überall
  „Standardvorlage" (Dialog, Hilfe, Einstieg) — mit dem Hinweis, dass sie
  umfassend gedacht ist (rund 20 Punkte) und als Inspiration gilt: kopieren
  und nach Geschmack kürzen, aus 20 werden 5 bis 20. Kein plattformweiter
  Plan (Pläne gehören Nutzer oder Club) — dazu gibt es eine Skizze im Chat,
  nicht umgesetzt.
- **Hilfe auf Stand + Einstiegs-Leitfaden** (2026-09-13): die Anleitung
  (`lib/help-content.ts`) beschreibt wieder die heutige App — Zugang auf
  Einladung, Sortierung im Tabellenkopf, »Verwalten«, Löschfolgen, kompakte
  Übersicht, Vorschauen, Formatierungsleiste, gestufter Tipp-Picker, KI-Regel,
  Node-Systeme, Käfer-Knopf, Verlassen-Modal, Urheberrecht (27 Textstellen,
  Anleitung + Admin-Hilfe). Neu: Reiter **Einstieg** (`/help/einstieg`,
  öffentlich) mit „Worum es geht", EINEM Weg je Zielgruppe (Solo-Sammler:in,
  Club-Mitglied, Club-Owner/-Admin — Wahl per `?ich=`), „Die KI, ehrlich
  erklärt" (inkl. der SPIKE-Rückmeldung als Beispiel), „Tiefer einsteigen"
  und „Probleme melden". Im PDF-Handbuch ist der Einstieg das erste Kapitel.
- **Node-Systeme (Stern SPIKE) im Handbuch-Import** (2026-09-13, Rückmeldung
  aus einem echten Prompt-Lauf): Schalter/Lampen hängen dort einzeln
  adressiert an Nodes („8-SW-17", Lampen bis 288) — keine 8×8-Matrix. Der
  Prompt sagt jetzt ausdrücklich „Column/Row leer lassen, nichts erfinden";
  die Prüfung erkennt Node-Adressierung (`istNodeAdressiert`), meldet dann
  keine fehlende Matrix und die Tipps verlangen keine Rasterpositionen; die
  Vorschau zeigt „Node-System (keine Matrix — so richtig)".
- **Verlassen-Warnung immer als eigenes Modal** (2026-09-13): der native
  Browser-Prompt („Leave site?", beforeunload) ist aus `ui/form-leave-guard.tsx`
  raus — er lässt sich weder übersetzen noch gestalten. Stattdessen fängt der
  Guard bei ungespeicherten Änderungen jeden In-App-Link (Top-Nav, Zurück,
  Reiter) ab und zeigt „Weiter bearbeiten / Verwerfen / Speichern"; Verwerfen
  führt zum angeklickten Ziel. Tab schließen/Neuladen bleibt bewusst ungewarnt.
- **Tipp als Seite + Basis-Formatierung** (Redlining 2026-09-13, 15:11):
  „Tipp hinzufügen" ist eine eigene Seite (`/machines/[id]/tipps/new`) statt
  eines Dialogs. Neues `ui/format-textarea.tsx`: Leiste für fett, kursiv,
  Aufzählung, Link (setzt die Markdown-Zeichen aus `lib/mini-markdown`) plus
  Vorschau mit demselben Renderer wie die Anzeige — im Tipp-Text und in der
  Dokument-Notiz; Dokument-Notizen werden jetzt auch formatiert angezeigt.
- **Tipp-Picker gestuft** (2026-09-13): erst dieses Gerät (vorausgewählt),
  dann weitere Editionen desselben Titels (gleiche OPDB-Gruppe, z. B. Pro ↔
  Premium/LE), dann — zugeklappt — andere Modelle, und getrennt davon ganze
  Generationen (eigene Generation vorn). Ordnung in `lib/tipp-ziele.ts`.
- **Urheberrechts-Hinweis an jedem Upload** (2026-09-13, `ui/urheber-hinweis.tsx`,
  ein Wortlaut): Fotos, Logos, Profilbild, Dokumente, Handbuch-PDF,
  Fehler-Fotos und beide JSON-Importe — wer hochlädt, ist für die Rechte
  verantwortlich, besonders bei »öffentlich«. Bewusst nicht am Feedback-
  Screenshot (Abbild der App selbst, geht nur an den Betreiber).
- **Redlining-Runde Wissensbasis** (Notizen vom 2026-09-13, 14:29): der
  Handbuch-Reiter erklärt gleich im Kopf, wie Handbuch-Daten funktionieren
  (Modell-Ebene, Familie, Autor + Sichtbarkeit, Prompt-Weg, PDF nie
  gespeichert); leere Handbuch- und Guide-Reiter bieten eine aufklappbare
  **Vorschau** mit erfundenen WPC-95-Beispieldaten (`lib/wissen-beispiel.ts`,
  `wissen-vorschau.tsx`) — gerendert mit DENSELBEN Komponenten wie echte
  Einträge, per Test gegen dieselbe Import-Prüfung abgesichert; der
  Ollama-Satz im Guide-Reiter ist weg (Ollama ist auf Vercel kein Weg).
  Dazu (Notiz 14:35): „Handbuch auswerten" ist eine eigene Seite
  (`/machines/[id]/handbuch/auswerten`) statt eines Dialogs — Anleitung,
  Prompt, Einfügefeld, Prüfung und Tipps brauchen Platz und eine URL.
- **KI-Zugang neu geregelt** (2026-09-13, `lib/ki-zugang.ts`): kein
  Plattform-Schlüssel für die Inhalts-Generierung (kostenunsicher — Euro je
  Durchlauf, Menge nicht planbar). Handbuch auswerten, Guide erzeugen und
  Wartungspunkte aus dem Guide per KI in der App: nur Super-Admin — UI sperrt
  Reiter/Knöpfe mit Grund, Server (Route + Actions) prüft dieselbe Regel.
  Einzige Ausnahme: der KI-Reparaturvorschlag läuft für alle über den
  Plattform-Schlüssel. Eigener Anthropic-Schlüssel (BYO) nur noch für den
  Super-Admin. Für alle anderen ist der **Prompt-Weg** der Weg: erklärt in
  `lib/ki-hinweise.ts` (Warum, Schritte, geeignete Modelle mit Stand-Datum,
  Free-Warnung → `ui/prompt-weg.tsx`), und die Import-Prüfung gibt gezielte
  Tipps plus einen kopierbaren Nachfrage-Prompt (`lib/import-tipps.ts`,
  `ui/tipps-vorschau.tsx`). Der Super-Admin kann die KI in der App für sich
  abschalten (Konto → „KI in der App“, `user_settings.ki_in_der_app`,
  Migration 0059) und sieht dann den Prompt-Weg wie alle. Hilfe-Texte
  nachgezogen. E2E `e2e/ki-zugang.spec.ts`.
- **Geteilte Reparaturen überleben das Löschen der Maschine als Tipp**
  (2026-09-13, Stufe 3 — die „Brücke" aus dem Datenmodell-Redesign, ohne
  Rückverweis-Spalte): `deleteMachine`/`deleteMachines` befördern jede
  Reparatur-Freigabe zu einem Tipp am Modell (`lib/reparatur-tipp.ts`:
  `befoerderbar`, `tippAusReparatur`), BEVOR Freigaben und Maschine fallen.
  Reichweite verlustfrei oder gar nicht: platform → öffentlich, genau ein Club
  → Club; mehrere Clubs oder einzelne Personen erlöschen — die Löschfrage
  zählt beides getrennt. Anonyme Freigaben bleiben anonym: neue Spalte
  `knowledge.anonym` (Migration 0058), die drei Wissens-Komponenten zeigen
  dann „Anonym geteilt"; /kuratierung nennt den Autor weiter. Nur beim
  Löschen der MASCHINE — `deleteRepair` löscht. Kein Formularfeld für
  `anonym` (bewusst).
- **Maschine löschen: ehrlich, ohne Waisen, mit Rettung** (2026-09-13, Franks
  Frage „geht damit alles Öffentliche verloren?"): Handbuch/Guide/Tipps hängen
  am Modell und überleben — Reparaturen nicht, und ihre FREIGABEN blieben als
  Waisen in `shares` (kein FK, `artefakt_id` ist polymorph). Jetzt: die
  Löschfrage der Detailseite nennt, was andere verlieren (`lib/loeschfolgen.ts`,
  `getLoeschfolgen`); `deleteMachine`/`deleteMachines`/`deleteRepair` räumen
  Freigaben in derselben Transaktion ab (Migration 0057 holt den Altbestand
  nach); Wissen, das noch an `machine_id` hängt (Upload vor der Modell-
  Zuordnung), wandert ans Modell — beim ersten Zuordnen und vor dem Löschen
  (`umhaengbar`: was am Modell Autor+Typ doppeln würde, bleibt und gilt als
  verloren). Sammel-Löschen bleibt bei einem generischen Satz (keine Query je
  Zeile). E2E: `e2e/loeschen.spec.ts`.
- **Next 16.2.9 → 16.3.5** (2026-09-12): `npm audit` meldete elf Advisories
  gegen 16.2.9, darunter Proxy-Bypass im App Router, DoS über Server Actions,
  RCE in der Image-Optimierung (AVIF) — alle in 16.3.5 geschlossen. Gate:
  tsc, 211 Unit-Tests, Build, E2E 70/70. Bekanntes Rauschen seitdem: der
  Dev-Server loggt einen vom Client abgebrochenen RSC-Stream als
  „⨯ Error: The destination stream closed early" (Next #96704; Fix #96715
  gemerged, erst in 16.4) — in der E2E-Suite ~1× je Test, keine Auswirkung.
  Restliche Audit-Einträge sind Dev-Ketten (`drizzle-kit → @esbuild-kit →
  esbuild`, „Fix" wäre ein Downgrade) — bleiben.
- **Redlining 0.7.8** (2026-09-12): der Absturz „id.replace is not a function"
  beim Annotieren in Formularen mit `<input name="id">` ist upstream in 0.7.6
  behoben (`cssPath` prüft jetzt `typeof id === "string"`); hier angehoben —
  Manifest und Lockdatei zusammen, nach einem versehentlichen `pnpm add`
  einmal `node_modules` neu aufgebaut.
- **Review-Reste 09/2026 abgeräumt** (2026-09-12, verhaltensneutral, Specs
  unverändert grün): `ROLE_LABEL` → `ENUM_LABEL`; `lib/sharing.FreigabeEntwurf`
  ist die eine Quelle (`queries/shares.ts` liefert `ShareScope`, zwei Casts
  weg); `createTipp`, `updateKnowledge`, `hideKnowledge` geben `{ ok: true }`
  zurück, ihre drei Dialoge schließen auf `state.ok`; `ui/rename-dialog.tsx`
  ersetzt die zwei byte-gleichen Umbenennen-Dialoge. Was bewusst blieb: siehe
  „Offen".
- **`status-steuerung.tsx` geprüft** (2026-09-12): sauber — das Formular sitzt
  hinter „Status manuell setzen" und unmontiert sich bei Erfolg, der
  Fehlerpfad lässt die Eingabe stehen. Der Form-Reset-Audit ist damit komplett
  (54 Action-Formulare, betroffen war nur `set-visibility.tsx`).
- **Sign-up-Endpunkt geschlossen** (2026-09-11): der databaseHook in
  `lib/auth.ts` lehnt jede Konto-Anlage ohne `claiming`-Einladung ab (Ausnahme:
  Bootstrap). Damit greift die Sperre auch am rohen
  `POST /api/auth/sign-up/email`, den die Server Action nicht abdeckt.
  `disableSignUp` bleibt bewusst `false` — der Schalter sitzt im selben
  Endpunkt-Handler, den der Einladungsfluss selbst aufruft. Die drei Tests in
  `e2e/registrierung.spec.ts` behaupten jetzt Einladungspflicht.
- **Sichtbarkeit wirkt sofort** (2026-09-11): zwei Ursachen — die Action
  revalidierte die Modellseite gar nicht, und React 19 setzte das Formular
  zurück. Beides behoben, Regressionstest `e2e/sichtbarkeit.spec.ts`.
- **Zugang wieder auf Einladung** (2026-09-11): Selbst-Registrierung ist nicht
  mehr möglich. Alle sechs „Konto erstellen"-Stellen auf Start, Funktionen,
  Preview, Login und /tour zeigen jetzt „Zugang anfragen" (mailto); /register
  zeigt ohne Einladungs-Token kein Formular; `registerAccount()` lehnt ohne
  Einladung ab (Ausnahme: Bootstrap auf leerer Installation). Den rohen
  Better-Auth-Endpunkt schließt der databaseHook (Eintrag oben).
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

- **Globale Suche** (Feedback 2026-09-17, „Suchfeld für die komplette Seite"):
  ein Suchfeld in der Nav über Maschinen (`maschinenFuer`) und Hilfe-Abschnitte
  (`filtereHilfe`) — beide Regeln existieren, es fehlt nur die Seite/Palette.
  Zurückgestellt, weil /machines und /help je ein eigenes Suchfeld haben.

- **`npm run lint` meldet 7 vorbestehende Fehler** (Stand 2026-09-12, auch auf
  16.2.9): fünf `react/no-unescaped-entities` (rohe `"` in JSX auf
  /datenschutz, /features, /log, /preview, /s/[code]) und zwei
  `react-hooks/set-state-in-effect` in `qr-print.tsx` (localStorage-Restore
  im Effekt). Kein Build-Blocker — Next 16 lintet im Build nicht mehr. Die
  fünf Anführungszeichen sind Einzeiler; `qr-print` bräuchte ein
  `useSyncExternalStore` oder einen Lazy-Initializer.

- **Review 09/2026 — was nach dem Abräumen bewusst blieb:** der Rollen-Dialog
  (`admin-user-roles.tsx` ↔ `member-actions.tsx`) bleibt zweimal gebaut — eine
  Extraktion bräuchte ≥ 8 Props, und das „Wo?"-Select koppelt `setOrt` an
  `setRolle`; netto null Zeilen bei einer Datei mehr. `add-member-form` und
  `invite-user-form` schließen weiter auf `ok || message`, weil `inviteMember`
  legitim eine lesbare `message` liefert. Die Dialog-Fußzeile (Abbrechen +
  Submit) steht in 14 Formularen gleich — Nachbarcode, eigene Entscheidung.

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

- **`derived_knowledge_id`** — *in anderer Form umgesetzt (2026-09-13):* eine
  geteilte Reparatur wird beim Löschen der Maschine zum Tipp befördert
  (`lib/reparatur-tipp.ts`). Ohne Rückverweis-Spalte, weil die Reparatur
  danach nicht mehr existiert. Reparatur-Sharing bleibt in
  `shares`/`share_targets` (Kosten-Projektion + Anonymität); ein manuelles
  „Befördern" zu Lebzeiten der Maschine gibt es nicht — Bedarf abwarten.
