# UX-Konsolidierung: alle Seiten auf das Admin-Muster bringen

Stand: 2026-09-02. Referenz-Implementierung: `admin/page.tsx`, `admin-user-roles.tsx`,
`admin-user-delete.tsx`, `actions/admin.ts` (in dieser Session gebaut).

## Prinzipien (aus der Session)

- **P1 Ein Muster je Fläche.** Keine Mischung aus Toggle-Buttons, „Select + Speichern"
  und Inline-Formularen in einem Panel.
- **P2 Kein dauerhaft aktives „Speichern".** Kleine, reversible Selects speichern beim
  Ändern; Text-Formulare deaktivieren Speichern, bis sich etwas vom gespeicherten Stand
  unterscheidet. Ganzseitige Neu/Bearbeiten-Formulare mit einem Speichern bleiben.
- **P3 Keine Klappen vor dem Hauptinhalt.** Inhalt steht offen da; bei Dichteproblemen
  ein Karten/Listen-`ViewToggle` (URL-Parameter `ansicht` + Cookie via `klebrig`).
- **P4 Kompakte Zeilen.** Eine Zeile je Eintrag, Badge inline nach dem Namen, rechts
  kleine Icon-Aktionen (Stift/Papierkorb, 14 px, `ICON_BTN`), Neu/Ändern im nativen
  `<dialog>`, Destruktives über `ConfirmButton` mit ausgesprochener Folge.
- **P5 Dummy-safe.** Unmögliches ist deaktiviert und sagt warum (Tooltip + kurzer Text).
  Der Grund kommt aus einer reinen Regel in `lib/`, die UI und Action gleich nutzen. Actions
  geben `FormState` zurück statt zu werfen (Auth-Guards dürfen werfen).
- **P6 Keine Debug-Links, keine Doppelanzeige** (Badge im Kopf UND als Control darunter,
  Fehlertext als Tooltip UND als Absatz).
- **P7 Menschliche Labels**, nie rohe Enum-Keys.

Entscheidungen, die alle Wellen betreffen:
- Neu/Ändern immer im `<dialog>` — auch dort, wo heute `AddDisclosure` steht (Einladung,
  Generation, Plan, Punkt, Tipp). `AddDisclosure` bleibt nur für Nebensächliches.
- Der Rollen-Katalog auf /admin behält die Mono-Keys (Lehrbeispiel).
- `/admin/visibility/<id>` bleibt unverlinkt.

## Welle 0 — Fundament (macht die anderen Wellen kurz) — ✅ umgesetzt 2026-09-02

1. `ICON_BTN` von `admin-user-roles.tsx` nach `ui/icon-button.tsx` (jetzt 3+ Nutzer).
2. Dialog-Hülle aus `RollenDialog` nach `ui/action-dialog.tsx` extrahieren (ref/showModal,
   Backdrop-Klick, `onClose`, schließt bei `state.ok`) — zweiter echter Nutzer ist die
   Mitgliederzeile im Club.
3. Label-Karten in `lib/`: Intervall-Typ (`zeit/spiele/bedarf`), Fehler-Status-Filter,
   ein `faelligLabel` für Wartung und Termine, Plural-Helfer für „1 Mitglied / 3 Mitglieder".
4. Reine Regeln: `einladungGesperrt(inv, userEmail, now)`, `wartungspunktGesperrt(task)`
   (Standard-verwaltet), `fehlendePlatzhalter(vorlage, platzhalter)`, `freieOverrideScopes`.
5. Actions werfen keine Fachregeln mehr, sondern geben `FormState` zurück (+ Aufrufer auf
   `ActionForm`, `ui/action-form.tsx`): `clubs.removeMember/leaveClub`, `invitations.accept/decline`,
   `maintenance-plans.deletePlan/deletePlanItem/planOderFehler`, `shares.unshareRepair`,
   `knowledge.restoreKnowledge`, `feedback.deleteFeedback`, `email-templates.reset`,
   Foto-Upload in `machines.create/update` (try/catch wie in faults.ts).

## Welle 1 — Fallen (Fehlerseiten, stille No-ops, Datenverlust) — ✅ umgesetzt 2026-09-02

| Wo | Was | Aufwand |
|---|---|---|
| Maschine neu/bearbeiten | Foto > 10 MB oder falscher Typ → Fehlerseite | S |
| Maschine bearbeiten | Club-Select wird ohne Recht still ignoriert → deaktiviert mit Grund, Action lehnt ab | S |
| Club-Seite | Letzter Owner klickt „Verlassen" → Fehlerseite; `ownerAnzahl` an `MemberActions`, Sperre aus `rolleEntfernenGesperrt` | M |
| Club-Seite | Rechte über `darfClub` statt `isClubManager/Owner` (Super-Admin sieht sonst nur lesend) | S |
| Reparatur teilen | Bestehende Club-Ziele gehen beim Ändern verloren → Ziele durchreichen, Submit erst wenn gültig | S |
| Prompts | Override für belegten Bereich überschreibt still; Platzhalter-Regel nicht erzwungen | M |
| Betriebsstatus | No-op-Submit pinnt Status manuell → Speichern erst bei Änderung, Server ignoriert Unverändertes | S |
| Konto | WhatsApp-Schalter ohne Nummer aktiv; „letzter Owner" als Text statt deaktiviertem Button; Einladung annehmen/ablehnen wirft | S |
| Wartung bearbeiten | Formular für Standard-Punkt wird gezeigt, Speichern scheitert → Hinweis statt Formular | S |
| Maschinenliste | Sammelmodus lässt Maschinen ohne Recht anhaken, meldet erst danach → Checkbox deaktiviert mit Grund | M |
| Admin Clubs | Löschen leitet auf /clubs statt zurück nach /admin/clubs; Frage nennt Folgen | S |

## Welle 2 — Musterangleich (Zeilen, Icons, Dialoge) — ✅ umgesetzt 2026-09-02

| Wo | Was | Aufwand |
|---|---|---|
| Club-Mitglieder | Zeile wie Admin-Rollen: Badge inline, Stift → Dialog, Papierkorb/Verlassen als `ConfirmButton`-Icons; Einladungen als `ListRow` mit Papierkorb, abgelaufene raus | M |
| Wartung (Maschine) | Task-Zeile: eine Zeile, rechts Haken (kleiner Dialog Datum/Notiz), Stift, Papierkorb; Historie als Link → Dialog; Standard-verwaltet = deaktiviert mit Grund | L |
| Fehler/Reparaturen/Termine/Dokumente | Text-Links → Icon-Aktionen; KI-Reparaturvorschlag raus aus der Liste, rein in `/repairs/new` | M |
| Reparatur teilen | `<details>` → „Teilen"-Icon → Dialog; „Freigabe aufheben" bestätigen | M |
| Handbuch/Wissen | Faktentabellen offen laden; „Bearbeiten"/„Verlauf"-Klappen → Stift-Dialog + Link-Dialog; Sichtbarkeit speichert beim Ändern, Doppelanzeige weg | M |
| Guide-Tab | Zwei dauerhaft offene Formulare → ein „Guide erstellen/ersetzen"-Dialog mit Modus-Schalter | M |
| Wartungspläne | Zwei Klappen + drei Bearbeiten-Muster → Dialoge (Plan, Punkt, Umbenennen), `ICON_BTN`, Labels | M |
| Feedback (Admin) | Inline „Select + Speichern" je Zeile → Status speichert beim Ändern, Antwort per Stift-Dialog; Papierkorb-Icon; Status nicht doppelt | M |
| Generationen | Inline-Umbenennen → Dialog; Modell-Liste nicht als Klappe, sondern Link auf `/admin/modelle?gen=`; `ICON_BTN` | M |
| Konto | Klappen „Passwort ändern"/„Konto löschen" auf; WhatsApp als Schalter der beim Ändern speichert; Annehmen/Ablehnen als `Button` | M |
| Tipps | Eigener Karten/Listen-Toggle → `ViewToggle` + Cookie; Stift/Papierkorb im Kopf; `VisibilityField` statt eigener Texte | S |

## Welle 3 — Politur (viele S) — ✅ umgesetzt 2026-09-02 (offen: siehe unten)

- Dauerhaft aktive „Speichern": prompt-editor, email-template-form, whatsapp-settings-form,
  share-settings-form, user-logo-form, club-logo-form, account E-Mail-Form, knowledge-edit
  (Tipp), plan-items → `disabled` bis geändert; Logo-Formulare erst mit Datei.
- Unbestätigtes Destruktives: „Logo entfernen", Share-„Zurücksetzen", Historie-Eintrag.
- Rohe Keys/Plurale/Doppeltexte: „3 Mitglied(er)", „N Modell(e)", `invite_platform` im
  Vorlagen-Kopf, `WHATSAPP_PROVIDER=twilio` im Status, „— ohne Generation —" in drei
  Varianten, Fehlertext doppelt in Mail-/WhatsApp-Protokoll, „AN/aus", doppeltes h2
  „Geteilte Reparaturen", zwei Zurück-Links auf der Club-Seite.
- Admin-Nav: „WhatsApp-Protokoll", Reihenfolge nach Konfiguration/Protokolle gruppiert.
- Mail-/WhatsApp-Protokoll: `ViewToggle` kompakt/voll statt 50 Mail-Körper je Seite.
- Einladungsseite: Überschrift ohne Club „Einladung", falsches Konto → Abmelden anbieten.
- Registrieren ohne Einladung: Submit deaktiviert mit Hinweis.
- Nebenbei-Bug: Termin-Bearbeiten wandelt Datum per UTC → in CET abends einen Tag früher.

## Nach Welle 3 bewusst offen

- Prompts-Seite als Ganzes (Karte je Prompt mit Editor + Refinery + Override-Klappe,
  Aufwand L) — nur Kopfzeile entdoppelt, Speichern-Sperre, Override-Regeln umgesetzt.
- `AiProviderField` doppelt in der Prompt-Refinery (Test- und Verbessern-Formular).
- Maschinenliste: zwei Sammel-Leisten (Zuweisen/Löschen) mit doppelter Chrome (M).
- Modell-Seite: eigener Zurück-Link statt `PageHeader`; kein Tipps-`ViewToggle` dort.
- StatusBadge zeigt Status/Prioritäten jetzt groß („Offen") — Hilfetexte nennen
  Status weiter in »kleiner« Schreibweise als Werte.

## Verifikation je Welle

`npx eslint` auf berührten Dateien, `npx tsc --noEmit` (gefiltert auf berührte Dateien),
`npm test`; neue reine Regeln bekommen Vitest-Tests; Dialog-Flüsse bekommen Playwright-
Specs nach dem Muster `e2e/admin-rollen.spec.ts`. Kein Commit ohne Anweisung.
