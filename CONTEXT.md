# Pinball Manager

Reparatur- und Verwaltungsdatenbank für Flipperautomaten. Dieses Dokument ist ein
**Glossar** — es legt fest, wie die Dinge heißen, nicht wie sie gebaut sind. Die
Begründungen hinter dem Datenmodell stehen in
[docs/pinball-manager-datenmodell.md](docs/pinball-manager-datenmodell.md).

Die Domänensprache ist deutsch. Neue Module, die einen Begriff von hier tragen,
heißen deutsch (`betriebsstatus`, `faelligkeit`, `rechte`); Module ohne
Domänenbezug bleiben englisch (`generate`, `storage`).

## Ebenen

**Generation**:
Eine Hardware-Plattform, auf der viele Modelle aufbauen — WPC-95, Stern SAM, Spike 2.
Ein Modell gehört zu genau einer Generation.

**Modell**:
Ein Flippertyp, wie er ab Werk existiert — „Monster Bash (Williams 1998)".
Monster Bash und Monster Bash Remake sind zwei Modelle, nicht eines.
_Avoid_: Gerätetyp, Machine, Group

**Familie**:
Alle Modelle mit demselben Familienschlüssel — den ersten zwei Segmenten der
OPDB-Referenz (`GV8wB-MRjKd`). Pokémon LE (`GV8wB-MRjKd-ARz2r`) und Pokémon
Premium/LE (`GV8wB-MRjKd`) sind eine Familie: **baugleich**, gleiche Spulen- und
Schaltermatrix, teilen ihr Wissen. Pokémon Pro (`GV8wB-Mq12N`) gehört nicht dazu.
Jedes Modell bleibt eigener Katalogeintrag; die OPDB-Referenzen sind vorgegeben
und werden nie verändert oder zusammengelegt.
_Avoid_: Gruppe (das ist die OPDB-Titelebene Pro + Premium + LE), Alias, Variante

**Edition**:
Ein Modell innerhalb einer Familie mit eigener Bezeichnung — LE, Premium,
Premium/LE.

**Maschine**:
Ein konkretes Gerät, das jemandem gehört — „Franks Monster Bash". Instanz genau
eines Modells.
_Avoid_: Flipper, Gerät, Automat (als Entitätsname; in Fließtext ist
„Flipperautomat" in Ordnung)

## Betrieb

Betrieb ist ein Ereignis und hängt immer an einer Maschine. Betriebsdaten wandern
nie auf die Modell- oder Generationsebene.

**Fehler**:
Eine Beobachtung an einer Maschine. Trägt das Symptom und kann dauerhaft offen
bleiben, ohne dass je eine Reparatur folgt.
_Avoid_: Störung, Defekt, Bug, Issue

**Reparatur**:
Ein durchgeführter Eingriff an einer Maschine. Verweist optional auf einen oder
mehrere Fehler und schließt sie. Das Symptom steht am Fehler, nie an der Reparatur.

**Wartungspunkt**:
Eine wiederkehrende Aufgabe an einer Maschine — im Unterschied zum Fehler geplant
statt beobachtet.
_Avoid_: Task, Wartungsaufgabe

**Betriebsstatus**:
Wie einsatzbereit eine Maschine ist: `spielbereit`, `eingeschraenkt` oder
`ausser_betrieb`. Wird aus offenen kritischen Fehlern abgeleitet, kann aber von
Hand übersteuert werden.
_Avoid_: Zustand, Health, Verfügbarkeit

## Fälligkeit

Gilt nur für zeitbasierte Wartungspunkte; alle anderen haben keinen Termin.

**fällig**:
Der Termin ist erreicht oder überschritten — der heutige Tag zählt dazu.

**überfällig**:
Der Termin liegt vor heute. Echte Teilmenge von *fällig*.

**bald**:
Der Termin liegt in den nächsten 14 Tagen, aber nicht heute oder früher.
*bald* und *fällig* überschneiden sich nicht.

## Wissen

Wissen ist zeitlos und hängt an einer der drei Ebenen — im Gegensatz zum Betrieb,
der immer an einer Maschine hängt. Wer eine Reparatur teilen will, erzeugt einen
neuen Wissenseintrag, der auf sie zurückverweist; die Reparatur selbst wandert nicht.

**Wissenseintrag**:
Eine zeitlose Information, die für alle Maschinen einer Ebene gilt — Handbuchfakten,
Rubbermaps, Troubleshooting-Guides, Anleitungen.
_Avoid_: Artikel, Doku, Knowledge-Item

**Geltungsbereich**:
Für welche Maschinen ein Wissenseintrag relevant ist: `generation`, `model` oder
`machine`. Unabhängig von der Sichtbarkeit.
_Avoid_: Scope, Ebene (wenn der Geltungsbereich gemeint ist)

**Sichtbarkeit**:
Wer einen Wissenseintrag sehen darf: `privat`, `club` oder `oeffentlich`.
Frei mit dem Geltungsbereich kombinierbar — „gilt für alle WPC-95, sieht aber nur
ich" ist ein gewollter Zustand.
_Avoid_: Freigabe, Berechtigung, Permission

**Ausblenden**:
Ein Wissenseintrag von oben gilt an der eigenen Maschine nicht.

**Eigene Version**:
Ein Wissenseintrag auf Maschinenebene, der einen geerbten ersetzt und auf das
Original zurückverweist.
_Avoid_: Fork, Kopie, Override

## Rechte

**darf**:
Was die angemeldete Person mit einem konkreten Objekt tun darf — etwa
`{ bearbeiten, loeschen, teilen }`. Dieselbe Antwort steuert die Anzeige und die
Durchsetzung, damit die Oberfläche nie mehr anbietet, als erlaubt ist.
_Avoid_: Permissions, Rights, can/allowed

**Club**:
Eine Gruppe, die Maschinen gemeinsam betreut. Mitglieder tragen dort eine Rolle:
`owner`, `admin` oder `member`.
_Avoid_: Verein, Team, Organisation

**Kurator**:
Globale Rolle, die geteilte Wissenseinträge nachträglich verbergen darf. Greift
erst nach der Veröffentlichung — es gibt bewusst keine vorgelagerte Freigabe.

**Supporter**:
Globale Rolle mit Nur-Lese-Einblick in Club-Daten, ohne jede Änderungsbefugnis.
