# Pinball Manager — Datenmodell Wissensbasis

Entwurfsstand: 29. Juli 2026
Status: Entscheidungsgrundlage, noch nicht umgesetzt

---

## 1. Zweck

Dieses Dokument beschreibt, wie Wissen (Handbuchextrakte, Rubbermaps, Troubleshooting, Anleitungen) und Betriebsdaten (Störungen, Reparaturen, Wartungen) im Pinball Manager verortet werden. Ziel ist, dass eine Information genau einmal gepflegt wird und automatisch bei allen Geräten erscheint, für die sie gilt — ohne dass private Daten dabei ungewollt sichtbar werden.

---

## 2. Die drei Ebenen

| Ebene | Beispiel | Herkunft |
|---|---|---|
| Generation | WPC-95, Stern SAM, Spike 2 | externe Datenquelle, führt OPDB-ID mit |
| Modell | Monster Bash (Williams 1998) | OPDB, Ebene „Machine" |
| Flipper | Franks Monster Bash | vom Nutzer angelegt |

Ein Modell gehört zu genau einer Generation. Ein Flipper ist eine Instanz genau eines Modells.

**Modell = OPDB-Machine, nicht OPDB-Group.** Monster Bash und Monster Bash Remake sind damit zwei getrennte Modelle mit getrennten Handbüchern und unterschiedlichen Generationen. Das ist gewollt.

**Familie = die ersten zwei Segmente der OPDB-Referenz.** OPDB-Referenzen sind `Gruppe-Maschine[-Alias]`; technisch relevant sind nur Gruppe und Maschine. Alle Modelle mit demselben Familienschlüssel (`opdb_machine_ref`, z. B. `GV8wB-MRjKd`) sind **baugleich** — Editionen wie Pokémon LE, Premium und Premium/LE. Sie teilen Handbuchfakten, Guides, Tipps, geteilte Reparaturen und die Generation; gelesen wird über `queries/familie.ts`, die Regel steht rein in `lib/opdb-ref.ts`. Die Zeilen selbst bleiben getrennt und die Referenzen unverändert: OPDB-Referenzen sind vorgegeben und werden nicht zusammengelegt. Pokémon Pro (`GV8wB-Mq12N`) ist eine andere Maschine und nicht baugleich.

**Baugruppen** (Flipperspulen, Optos, Netzteile) sind eine mögliche vierte Ebene, werden aber jetzt nicht gebaut. Das Modell ist so angelegt, dass sie später ohne Datenmigration ergänzt werden kann.

---

## 3. Zwei unabhängige Achsen

Der häufigste Denkfehler bei diesem Modell ist, „für wen gilt es" und „wer darf es sehen" in ein Feld zu packen. Das sind zwei Dinge:

**Geltungsbereich** — für welche Flipper ist die Information relevant?
`generation` | `model` | `machine`

**Sichtbarkeit** — wer darf sie sehen?
`privat` | `club` | `oeffentlich`

Beides ist frei kombinierbar. „Gilt für alle WPC-95, sieht aber nur ich" ist ein legitimer und häufiger Zustand — eine Notiz, die noch nicht reif zum Teilen ist. Wer das in ein Feld packt, kann es später nicht mehr trennen.

---

## 4. Wissen und Betrieb sind getrennt

**Wissen** ist zeitlos und hängt an einer der drei Ebenen.
Beispiel: „Bei WPC-95 Netzteilen sind die Pins an J118 typische Kandidaten für kalte Lötstellen."

**Betrieb** ist ein Ereignis und hängt immer am konkreten Flipper. Störungen, Reparaturen und Wartungen wandern nie nach oben.
Beispiel: „14.03.2026, J118 nachgelötet, 2 Std., Ersatzteil 4,80 €."

Eine Störung (Fault) ist eine Beobachtung und kann dauerhaft offen bleiben, ohne dass es je eine Reparatur gibt. Eine Reparatur verweist optional auf eine oder mehrere Störungen und schließt sie. Symptome liegen am Störungsdatensatz.

### Die Brücke

Wer eine Reparatur teilen möchte, verschiebt sie nicht nach oben. Es entsteht ein **neuer Wissenseintrag** auf der gewählten Ebene, der auf die Reparatur zurückverweist (`repairs.derived_knowledge_id`).

Begründung:

- Die eigene Historie bleibt vollständig und privat, inklusive Kosten und Lieferant.
- Das Geteilte ist bewusst formuliert statt versehentlich preisgegeben.
- Mehrere Reparaturen können auf denselben Wissenseintrag zeigen. Genau das ist das Signal „bekanntes Serienproblem".

---

## 5. Overrides und eigene Versionen

Wissen von oben vererbt sich automatisch nach unten. Ein Flipper sieht das Wissen seines Modells und seiner Generation, ohne dass etwas verknüpft werden muss.

Zwei Mechanismen erlauben Abweichungen am eigenen Gerät:

**Ausblenden** — „Die Standard-Rubbermap gilt bei mir nicht, ich habe Titan-Ringe."
Eintrag in `knowledge_overrides` mit `action = 'hidden'`.

**Eigene Version (Fork)** — ein neuer Wissenseintrag auf Flipper-Ebene mit `forked_from_id` auf das Original, plus Override mit `action = 'replaced'`.

Der Rückverweis ist wichtig: nur damit lässt sich später anzeigen „das Modell-Handbuch wurde aktualisiert, deine Version stammt von davor". Ohne ihn ist eine geforkte Version dauerhaft eine Waise.

---

## 6. Community-Modell

Bewusst leichtgewichtig. **Keine vorgelagerte Freigabe.**

- Jeder Eintrag zeigt seinen Autor.
- Jede Bearbeitung erzeugt eine Revision, nichts wird überschrieben.
- Leichte Signale statt Bewertungslogik: „hat geholfen" / „stimmt so nicht".
- Eine kleine Gruppe Kuratoren kann nachträglich eingreifen, korrigieren oder zurückrollen.

Begründung: Vorgelagerte Freigabeprozesse ersticken die Beitragsbereitschaft in Freiwilligengruppen zuverlässig. Versionierung macht Fehler dagegen billig rückgängig. Echte Moderation kann nachwachsen, sobald es einen Anlass gibt — vorher ist sie Aufwand ohne Nutzen.

Schreibrechte:

| Ebene | wer darf schreiben |
|---|---|
| Generation | jeder angemeldete Nutzer |
| Modell | jeder angemeldete Nutzer |
| Flipper | nur Besitzer bzw. Club-Mitglieder mit Rolle |

---

## 7. Tabellen

Skizze, Postgres. Autorisierung liegt in der Anwendungsschicht, nicht in RLS.

```sql
create type knowledge_visibility as enum ('privat', 'club', 'oeffentlich');
create type knowledge_source     as enum ('extrahiert', 'eigen', 'community');
create type override_action      as enum ('hidden', 'replaced');

create table generations (
  id            uuid primary key,
  name          text not null,          -- 'WPC-95'
  hersteller    text,
  jahr_von      int,
  jahr_bis      int
);

create table models (
  id                    uuid primary key,
  opdb_id               text not null unique,
  opdb_group_id         text,           -- OPDB-Titel (Pro + Premium + LE)
  opdb_machine_ref      text,           -- Familienschlüssel (erste zwei Segmente), indiziert
  name                  text not null,
  hersteller            text,
  jahr                  int,
  generation_id_import  uuid references generations(id),
  generation_id_manual  uuid references generations(id)
);
-- effektive Generation = coalesce(generation_id_manual, generation_id_import)

create table machines (
  id            uuid primary key,
  model_id      uuid not null references models(id),
  owner_id      uuid not null references users(id),
  club_id       uuid references clubs(id),
  name          text,
  seriennummer  text,
  notizen       text
);

create table knowledge (
  id              uuid primary key,
  typ             text not null,        -- 'handbuch_fakten', 'rubbermap',
                                        -- 'troubleshooting', 'anleitung', 'teileliste'
  titel           text not null,
  inhalt          jsonb not null,
  quelle          text,                 -- Freitext-Herkunftsangabe
  source_type     knowledge_source not null,
  visibility      knowledge_visibility not null default 'privat',

  generation_id   uuid references generations(id),
  model_id        uuid references models(id),
  machine_id      uuid references machines(id),

  forked_from_id  uuid references knowledge(id),
  created_by      uuid not null references users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint genau_eine_ebene
    check (num_nonnulls(generation_id, model_id, machine_id) = 1)
);

-- UMGESETZT (08/2026, Migration 0030). Abweichung: edited_by ist `text`
-- (Better-Auth-User-Id, wie knowledge.created_by). Eine Revision speichert den
-- Stand VOR der Änderung; geschrieben von updateKnowledge (In-Place-Edit) und
-- von der Neu-Generierung/Import (facts-store, schreibeMitRevision).
create table knowledge_revisions (
  id            uuid primary key,
  knowledge_id  uuid not null references knowledge(id) on delete cascade,
  titel         text not null,
  inhalt        jsonb not null,
  edited_by     uuid not null references users(id),
  edited_at     timestamptz not null default now(),
  kommentar     text
);

create table knowledge_overrides (
  machine_id      uuid not null references machines(id) on delete cascade,
  knowledge_id    uuid not null references knowledge(id) on delete cascade,
  action          override_action not null,
  replacement_id  uuid references knowledge(id),
  primary key (machine_id, knowledge_id)
);

create table knowledge_signals (
  knowledge_id  uuid not null references knowledge(id) on delete cascade,
  user_id       uuid not null references users(id),
  signal        text not null,          -- 'hilfreich' | 'falsch'
  created_at    timestamptz not null default now(),
  primary key (knowledge_id, user_id)
);

create table faults (
  id            uuid primary key,
  machine_id    uuid not null references machines(id) on delete cascade,
  symptom       text not null,
  beschreibung  text,
  status        text not null default 'offen',   -- 'offen' | 'behoben' | 'verworfen'
  gemeldet_von  uuid references users(id),
  gemeldet_am   timestamptz not null default now()
);

create table repairs (
  id                    uuid primary key,
  machine_id            uuid not null references machines(id) on delete cascade,
  datum                 date not null,
  beschreibung          text not null,
  kosten                numeric(10,2),
  durchgefuehrt_von     uuid references users(id),
  derived_knowledge_id  uuid references knowledge(id)
);

create table repair_faults (
  repair_id  uuid not null references repairs(id) on delete cascade,
  fault_id   uuid not null references faults(id) on delete cascade,
  primary key (repair_id, fault_id)
);
```

### Warum drei Spalten statt `scope_type` + `scope_id`

Drei nullable Fremdschlüssel mit Check-Constraint geben echte referenzielle Integrität. Die polymorphe Variante kann Postgres nicht prüfen — dort landen früher oder später verwaiste Verweise. Eine vierte Ebene (Baugruppen) bedeutet später: eine Spalte ergänzen, Constraint auf `= 1` erweitern. Keine Datenmigration.

### Auflösung: welches Wissen sieht ein Flipper

1. Wissen der effektiven Generation des Modells
2. Wissen des Modells
3. Wissen des Flippers selbst
4. gefiltert nach Sichtbarkeit und Mitgliedschaft des anfragenden Nutzers
5. abzüglich aller Einträge mit `knowledge_overrides.action = 'hidden'`
6. bei `action = 'replaced'` wird stattdessen `replacement_id` ausgeliefert

---

## 8. Copyright-Designregeln

Rechtliche Einordnung nach deutschem Recht, ohne Anwaltsprüfung. Sobald die Nutzung kommerziell wird, sollte ein Fachanwalt einmal draufschauen.

**Was trägt:**

- Einzelne technische Fakten haben keine Schöpfungshöhe (§ 2 UrhG). Eine Schaltmatrix beschreibt die Verdrahtung, sie gestaltet nichts.
- Der Extraktionsvorgang selbst ist von der TDM-Schranke gedeckt (§ 44b UrhG). Vervielfältigungen rechtmäßig zugänglicher Werke zur automatisierten Analyse sind zulässig; sie sind zu löschen, sobald sie nicht mehr erforderlich sind. Das Upload-und-Löschen-Muster erfüllt das wörtlich.
- Das Datenbankherstellerrecht (§§ 87a ff.) dürfte nicht greifen: nach EuGH BHB-Pferdewetten zählt nur Investition in die *Beschaffung* vorhandener Daten, nicht in deren *Erzeugung*. Der Hersteller hat die Matrix beim Konstruieren erzeugt. Zusätzlich läuft der Schutz nach 15 Jahren aus — bei allen Vorkriegs- bis WPC-Geräten längst.

**Vier Regeln fürs Design:**

1. **Fakten statt Ausdruck.** Gespeichert werden Tabellen, nie Fließtext aus dem Original. Troubleshooting-Kapitel, Einstellhinweise und alle Zeichnungen, Schaltpläne und Explosionsdarstellungen sind geschützt (§ 2 Abs. 1 Nr. 7 UrhG) und werden nicht übernommen.
2. **Eigene Normalform.** Struktur, Reihenfolge und Anordnung des Originals werden nicht nachgebaut. Auswahl und Anordnung können als Sammelwerk geschützt sein (§ 4 UrhG). Das Original darf aus der Datenbank nicht rekonstruierbar sein.
3. **Rechtmäßiger Zugang ist Voraussetzung, nicht Formalie.** § 44b setzt „rechtmäßig zugänglich" voraus. Die Bestätigung beim Upload lautet daher: *„Ich besitze dieses Gerät bzw. habe rechtmäßigen Zugang zu diesem Dokument"* — nicht „ich habe die Rechte".
4. **Löschung nachweisbar machen.** Die serverseitige Löschung des PDF wird mit Zeitstempel protokolliert. Bei einer Anfrage eines Rechteinhabers kann man dann zeigen statt argumentieren.

Das Feld `knowledge.source_type` dient genau diesem Zweck: bei einer Anfrage lassen sich extrahierte Inhalte gezielt herausfiltern, ohne die gesamte Wissensbasis durchzusehen.

---

## 9. Bewusst vertagt

| Punkt | Warum jetzt nicht | Was heute schon vorbereitet ist |
|---|---|---|
| Baugruppen als 4. Ebene | keine Datenquelle vorhanden | Check-Constraint erweiterbar, keine Migration nötig |
| Stern Pro/Premium/LE zusammenführen | Gelöst ohne Zusammenlegen: Premium/LE-Editionen bilden eine **Familie** (gleiche ersten zwei OPDB-Segmente) und teilen ihr Wissen; Pro bleibt eigene Maschine (§2) | `opdb_machine_ref` + `queries/familie.ts` |
| Echte Moderation und Rollen | kein Missbrauch, keine Masse | Revisionen und Signale ab Tag eins |
| Zweiwege-Sync mit externen Quellen | offene API-Fragen | Import- und Manual-Feld getrennt |

---

## 10. Offene Punkte

- Verhalten bei Modellwechsel eines Flippers (Umbau, Fehlzuordnung): Overrides und Gerätewissen mitnehmen oder verwerfen? (Ein Wechsel innerhalb der Familie, z. B. LE → Premium/LE, ist baugleich und widerruft keine Freigaben; nur ein echter Wechsel tut das.) Bekannt: eigene Einträge, die vor der Familienregel auf zwei Editionen entstanden, bleiben zwei sichtbare Einträge.
- Standard-Sichtbarkeit für neu extrahierte Handbuchfakten: `privat` oder `club`? Der Default entscheidet in der Praxis mehr über das Verhalten als die Auswahlmöglichkeit.
- Sollen Signale („stimmt so nicht") ab einem Schwellwert automatisch etwas auslösen, oder bleibt das rein informativ?
