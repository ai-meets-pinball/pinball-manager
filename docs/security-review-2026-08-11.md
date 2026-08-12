# Security- & Code-Review — 2026-08-11

Umfang: gesamte Codebasis, Fokus auf die in dieser Session neu entstandene
Angriffsfläche (QR-Melde-Route, Gast-Meldungen, Besitzer-/Einladungs-Kette,
Club-Logo-/SVG-Upload, `?von=`-Deep-Links). Methode: statische Analyse jeder
Server Action gegen ihr Auth-Gate, IDOR-/Mandanten-Prüfung der Lesepfade,
Eingabe-/XSS-/SSRF-Sichtung, Secrets-/Logging-Review, Test-Abdeckung.

**Gesamtbild:** solide Grundarchitektur. Die App-Layer-Autorisierung
(`lib/rechte.ts` + `lib/session.ts`) ist konsistent, alle SQL-Fragmente sind
parametrisiert (keine Injection), die Sharing-Feldprojektion läuft serverseitig,
React escaped die Gast-Eingaben. **Kein kritischer Befund.** Zwei Befunde mit
realem Missbrauchspotenzial (HOCH), dazu mehrere Härtungen (MITTEL/NIEDRIG).

---

## HOCH

### H1 — Unauthentifizierte Gast-Meldung ohne Rate-/Mengenlimit
`src/db/actions/qr-melden.ts:22`, Token-Default `src/db/schema.ts:323`

`meldeFehlerPerQr` ist die einzige Schreib-Action ohne Auth-Gate (bewusst —
Token-Besitz = Berechtigung). Es gibt aber **keinerlei Mengen-/Rate-Limit**.
Der QR-Aufkleber sitzt öffentlich am Automaten; jeder, der ihn sieht, kennt den
Token. Ein Skript kann damit **unbegrenzt** `faults`-Zeilen mit je 2000 Zeichen
Freitext anlegen → Flutung der Fehlerliste dieser Maschine, DB-Wachstum, die
Fehler-/Übersichtsseiten werden unbrauchbar (fachlicher DoS). Der 48-Bit-Token
schützt nur gegen *Raten* fremder Maschinen, nicht gegen Missbrauch der einen
Maschine, deren Sticker man sieht.

Empfehlung/Umsetzung: **nicht** die Gesamtzahl deckeln (ein öffentlicher Club
darf viele echte Melder haben — falsche Grenze), sondern die **Rate** je Maschine
in einem kurzen Zeitfenster begrenzen (max. 8 Gast-Meldungen / 10 min) plus
exakte **Duplikate** freundlich als „schon gemeldet" quittieren (keine zweite
Zeile). Angemeldete unbegrenzt. Serverless-tauglich, ohne neue Infrastruktur.
→ **behoben** (siehe unten).

### H2 — Broken Access Control: Datenzugriff vor dem Rechte-Gate (`inviteBesitzer`)
`src/db/actions/besitzer.ts:23-59`

Jeder angemeldete Nutzer kann diese Action mit **beliebiger** `machineId` +
`besitzerId` aufrufen. Die drei DB-Lookups (Maschine, Zuordnung, Besitzer) samt
**unterscheidbarer Fehlermeldungen** laufen, **bevor** irgendein Rechte-Gate
greift (das steckt erst in `inviteMember` → `requireClubManager`, Z. 69). Die
Meldungen bilden ein Orakel über fremde Vereine:
- „Nur Besitzer von Club-Maschinen …" → Maschine existiert nicht / ist privat,
- „Kein Besitzer dieser Maschine." → Maschine existiert, Zuordnung nicht,
- „Für diesen Besitzer ist keine E-Mail hinterlegt." → Besitzer existiert, keine Mail,
- „Dieser Besitzer hat bereits ein Konto." → Besitzer ist Plattform-Nutzer.

Der eigentliche Mailversand ist gegated (gut), aber die Existenz-/Zustandsinfos
über fremde Maschinen und Besitzer nicht. OWASP A01. Empfehlung: Club-Manager-
Gate **an den Anfang** ziehen (Maschine laden, `requireClubManager(clubId)`),
alle weiteren Lookups erst danach. → **behoben**.

---

## MITTEL

### M1 — SVG-Logo-Upload nur mit Denylist gefiltert
`src/lib/storage.ts:150`

`uploadClubLogo` prüft SVG per Blacklist (`/<script|javascript:|\son\w+\s*=/i`).
Nicht abgedeckt: `<foreignObject>`, `<use href/xlink:href>`, `<animate
attributeName="href">`, `<set>`, `<!ENTITY>`/XXE-Konstrukte, CSS `@import`,
`<a xlink:href="javascript:…">`, entity-kodierte Payloads (`&#106;avascript:`).
**Einordnung:** Das Logo wird von der **Supabase-Origin** ausgeliefert und in der
App nur per `<img>` eingebunden — dort führt kein SVG Skripte aus, und aktive
Inhalte auf `*.supabase.co` haben **keinen** Zugriff auf App-Session/Cookies
(andere Origin). Es ist also **kein** App-XSS. Restrisiko: der öffentliche Bucket
könnte zum Hosten aktiver SVG-Inhalte unter der Projekt-Domain missbraucht werden
(Phishing/Malware-Ablage). Empfehlung: Denylist um die genannten Muster erweitern
(bleibt Denylist — im Zweifel Rastergrafik erzwingen). → **gehärtet + Unit-Test**.

### M2 — Content-Security-Policy dauerhaft im Report-Only-Modus
`src/proxy.ts:26` (`CSP_REPORT_ONLY = true`)

Die nonce-basierte CSP ist ausdrücklich als Defense-in-Depth (u. a. für das
ephemere API-Key-Feld) gedacht, **blockiert aber nichts**. Der Schalter ist ein
bewusster Rollout-Mechanismus. Empfehlung: nach Verstoß-Prüfung in der Konsole
auf `false` schalten. Bewusst **nicht** im Rahmen dieses Reviews scharfgeschaltet
(Nicht-Ziel — kann bestehende Skripte brechen; separater Rollout).

---

## NIEDRIG

### N1 — Gate-lose Exporte in einem `"use server"`-Modul
`src/db/actions/machine-status.ts:62,74`

`mitStatusNachzug` und `aktualisiereMaschinenStatus` sind exportierte async-
Funktionen in einem `"use server"`-Modul → technisch als Server Actions (POST)
erreichbar, ohne Auth-Gate. `mitStatusNachzug` nimmt einen Callback (nicht
serialisierbar → praktisch nicht als Action aufrufbar). `aktualisiereMaschinen-
Status(machineId)` ist aufrufbar, **berechnet aber nur den ehrlichen abgeleiteten
Status neu** (No-Op bei manueller Pinnung) — keine Datenkorruption, kein Leak
(Rückgabe `void`). Impact daher gering; dennoch Hygiene: die zwei Helfer in ein
Nicht-Action-Modul verschieben (Muster: `src/db/besitzer-link.ts`). → **behoben**.

### N2 — Rohe Auth-Fehlermeldung an den Client
`src/db/actions/register.ts:145-147`

Der `catch` gibt `e.message` (Better-Auth-Rohtext) an den Client zurück →
schwaches Konto-Existenz-Orakel. Nur ausnutzbar mit gültigem Einladungs-Token
für genau die geprüfte Adresse (der Sign-up-Pfad ist token-gebunden), daher
niedrig. Empfehlung: generische Meldung, Details nur ins Server-Log. → **behoben**.

### N3 — `?von=`-Filter erkennt Backslash-Varianten nicht
`src/lib/session.ts:92`, `src/app/(auth)/login/page.tsx:26`

Der Filter lässt `startsWith("/") && !startsWith("//")` zu. Nicht abgedeckt:
`/\evil.com` bzw. `/\/evil.com` — Browser normalisieren `\`→`/`, woraus eine
protokoll-relative URL werden kann (plausibler Open-Redirect → Phishing).
Empfehlung: zusätzlich Backslash an Position 1 ablehnen. → **behoben** (beide Stellen).

### N4 — Cron: nicht-timing-sicherer Secret-Vergleich + E-Mail im Log
`src/app/api/cron/maintenance-reminders/route.ts:28,99`

`auth !== \`Bearer ${secret}\`` ist nicht konstant-zeitig (über Netz kaum
praktikabel, aber trivial zu härten). Z. 99 loggt bei Mailfehler die Empfänger-
E-Mail (PII im Server-Log). Empfehlung: `crypto.timingSafeEqual`, E-Mail aus dem
Log nehmen. → **behoben**.

### N5 — Einladungs-Landeseite ohne `noindex`
`src/app/invite/[token]/page.tsx`

Zeigt E-Mail + Club + Rolle zu einem Token. Token ist 192-Bit-Zufall
(`randomBytes(24)`, `invitations.ts`) → nicht enumerierbar, per Design eine
Bearer-Capability (wer den Link hat, soll das sehen). Restrisiko minimal.
Empfehlung: `robots: noindex` als Vorsichtsmaßnahme. Dokumentiert, nicht geändert.

---

## INFO / beobachten

- **I1 — SSRF latent:** `logoAlsDataUrl` (`src/app/(app)/machines/[id]/qr/page.tsx:42`)
  ruft `fetch(logoUrl)`. `logoUrl` stammt heute ausschließlich aus
  `uploadClubLogo` (immer Supabase-`getPublicUrl`) — kein Nutzer-Freitext, also
  **kein aktueller SSRF**. Sollte `logoUrl` je aus anderer Quelle stammen, den
  Fetch auf den Supabase-Host pinnen.
- **I2 — LIKE-Wildcards:** `searchMachineModels` (`src/db/actions/models.ts:48`)
  bettet die Suchanfrage ohne `%`/`_`-Escaping in `ilike \`%${q}%\`` (parametrisiert,
  keine Injection) — nur kosmetisch/Last, `limit(50)` begrenzt.
- **I3 — Auth-Rate-Limit:** kein expliziter `rateLimit` in `lib/auth.ts`. Better
  Auth aktiviert in Produktion ein Default-Limit; für den Sign-in-Endpoint ein
  engeres explizites Limit erwägen (Credential-Stuffing).
- **I4 — OPDB-Key im Query-String:** `src/lib/opdb.ts:76` (`?api_token=…`) — bei
  Fehlern wird nur `res.status` geloggt (Key nicht geleakt); Query-String-Keys
  können in Zwischen-Proxy-Logs landen. Header wäre sauberer.

---

## Bestätigt SAUBER (Negativbefunde)

- **AuthZ-Matrix:** alle Server Actions korrekt gegated. Die „requireUser + eigene
  Logik"-Gruppe (`knowledge.ts` setKnowledgeOverride/updateKnowledge/setKnowledge-
  Signal, `tipps.ts` deleteTipp, `machines.ts` assignMachinesToClub, `settings.ts`,
  `maintenance-plans.ts` darfPlanBearbeiten) prüft überall Ownership/Sichtbarkeit/
  Manager-Rolle **vor** der Wirkung; silent-returns sind idempotente No-Ops.
- **IDOR-Lesepfade:** `shareVisibilityFilter` + serverseitige Feldprojektion
  (`queries/shares.ts`) und `knowledgeVisibilityFilter` sind korrekt; Kosten/Name
  verlassen den Server nur bei Freigabe.
- **SQL-Injection:** keine — alle Nutzerwerte sind gebundene Parameter.
- **XSS:** der einzige `dangerouslySetInnerHTML` (QR-SVG) stammt aus der
  `qrcode`-Bibliothek über eine aus DB-Token + Env-URL gebaute URL; Gast-Name
  (`gemeldetVonName`) wird über React gerendert (escaped).
- **extract-manual-Route:** korrekt gegated (`requireMachineAccess` +
  `darf.bearbeiten`); BYO-Key wird nicht geloggt; Client-Fehler generisch.
- **Sign-up-Gate:** token-gebunden über `claiming`-Status (`lib/auth.ts`) — keine
  Fremdregistrierung bekannter Adressen.

---

## Code-Qualität — behoben

Aus dem Qualitäts-Review der neuen Module. Alles andere (Chip-Logik in
`machine-form.tsx`, `qr-download.tsx`-Encoding/Canvas, `machine-detail.ts`
Promise.all-Reihenfolge, Migrationen 0034–0039 inkl. aller RLS-Statements,
Token-Regex-Konsistenz) wurde geprüft und ist **sauber**.

- **Q1 (Risiko) — `machines.ts` `besitzerAufloesen`:** SELECT-dann-INSERT ohne
  Race-Schutz → paralleles Anlegen desselben Namens im selben Scope warf
  `machine_besitzer_*_name_unique` als **500 statt FormState-Fehler**.
  **Behoben:** neuer Helfer `legeBesitzerAn` fängt Postgres `23505` und lädt den
  vom Konkurrenten angelegten Eintrag nach; an beiden Insert-Stellen genutzt.
- **Q2 (Integrität) — `machines.ts` `besitzerAufloesen` (Eintrag-Weg):** prüfte
  nur Zugriff, nicht `eintrag.clubId === zielClubId` → ein Besitzer aus einem
  anderen (erlaubten) Scope ließ sich an die Maschine hängen. **Behoben:**
  Scope-Gleichheit wird jetzt verlangt.
- **Q3 (Nice-to-have) — `qr-download.tsx`:** Logo-Ladefehler → unbehandelte
  Rejection, stiller Abbruch. **Behoben:** try/catch mit sichtbarer Meldung.
- **Q4 (Nice-to-have) — `qr-download.tsx`:** dimensionsloses Logo-SVG →
  NaN-Skalierung, leeres Logo. **Behoben:** Fallback-Maße (Quadrat füllen).
- **Q5 (Nice-to-have) — `queries/knowledge.ts`:** `getTippZielKatalog` jetzt
  `Promise.all`; `tippModelId` mit `ORDER BY` (deterministisches Linkziel).

## Test-Lücken (Empfehlung)

Keine Specs für: `/m/[code]` + `meldeFehlerPerQr` (H1), `inviteBesitzer` (H2),
`assignMachinesToClub`, `maintenance-plans`-Rechte. Für M1 (SVG-Filter) und N3
(`?von=`-Open-Redirect) wurden in diesem Review Vitest-Tests ergänzt
(`storage.test.ts`, `safe-path.test.ts`).

---

## Angewandte Fixes (dieser Review)

| Befund | Datei | Änderung |
|---|---|---|
| H1 | `db/actions/qr-melden.ts` | Rate-Bremse (max. 8 Gast-Meldungen/10 min je Maschine) + Duplikat-Unterdrückung; Gesamtzahl bewusst NICHT gedeckelt |
| H2 | `db/actions/besitzer.ts` | `requireClubManager` vor die Lookups gezogen |
| M1 | `lib/storage.ts` (+`storage.test.ts`) | SVG-Denylist breit gehärtet, als testbare `svgVerletzung` |
| N1 | `db/machine-status-core.ts` (neu) | gate-lose Helfer aus dem `"use server"`-Modul verschoben |
| N2 | `db/actions/register.ts` | generische Fehlermeldung statt rohem Auth-Text |
| N3 | `lib/safe-path.ts` (neu, +Test) | Backslash-Schutz; `session.ts` + `login/page.tsx` nutzen ihn |
| N4 | `api/cron/maintenance-reminders/route.ts` | `timingSafeEqual`; E-Mail aus dem Log entfernt |

Nur dokumentiert (bewusst nicht geändert): M2 (CSP-Rollout), N5 (invite noindex),
I1–I4, Q1–Q5. Build grün, 118 Unit-Tests grün.
