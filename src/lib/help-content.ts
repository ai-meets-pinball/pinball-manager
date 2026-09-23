/*
  DIE eine Inhaltsquelle der Hilfe. Reine Daten ohne React — bewusst, damit
  derselbe Text zwei Abnehmer hat: die Hilfe-Seiten (/help, /help/admin) und
  den PDF-Generator (lib/manual-pdf.ts, Download unter /help/manual). Icons
  sind Sache der Seiten (Lookup per `key`); das PDF kennt keine Icons.
*/

export type HilfeSchritt = { titel?: string; text: string };

export type HilfeSektion = {
  /** Stabiler Schlüssel — verbindet die Sektion mit ihrem Icon in der Seite. */
  key: string;
  titel: string;
  einleitung: string;
  schritte: HilfeSchritt[];
  /** Nur in ADMIN_HILFE: Sektion nur für Super-Admins (Kuratoren sehen sie nicht). */
  nurSuperAdmin?: boolean;
};

/* ── Anleitung (alle Nutzer) ─────────────────────────────────────────────── */

export const ANLEITUNG: HilfeSektion[] = [
  {
    key: "erste-schritte",
    titel: "Erste Schritte",
    einleitung:
      "Zugang auf Einladung, anmelden, Passwort zurücksetzen — und wo was liegt.",
    schritte: [
      {
        titel: "Zugang auf Einladung",
        text: "Der Pinball Manager hat derzeit KEINE offene Registrierung. Ein Konto entsteht über eine Einladung: entweder lädt dich ein Club-Owner/-Admin in seinen Club ein, oder der Betreiber schickt dir eine Plattform-Einladung. Beides kommt als E-Mail mit Link — darüber legst du Name und Passwort an (mindestens 8 Zeichen mit Groß- und Kleinbuchstaben sowie einer Zahl); der Einladungslink belegt deine Adresse, eine extra Bestätigung entfällt. Noch keine Einladung? Auf der Startseite steht unter »Zugang anfragen« die E-Mail-Adresse des Betreibers.",
      },
      {
        titel: "Anmelden",
        text: "Danach mit E-Mail und Passwort anmelden. Mit dem Augen-Symbol lässt sich das Passwort anzeigen. Passwort vergessen? Der Link auf der Anmeldeseite schickt dir eine E-Mail zum Zurücksetzen.",
      },
      {
        titel: "Per Einladung beitreten",
        text: "Wurdest du in einen weiteren Club eingeladen und hast schon ein Konto, findest du die Einladung unter Konto → »Einladungen« (annehmen oder ablehnen) — oder du öffnest den Link aus der E-Mail.",
      },
      {
        titel: "Wo finde ich was?",
        text: "Auf größeren Bildschirmen liegen oben links »Übersicht« (dein Dashboard), »Maschinen«, »Termine«, »Wissensbasis« (geteiltes Wissen je Modell) und »Hilfe«. Auf dem Handy erreichst du dieselben Hauptbereiche über die Leiste am unteren Bildschirmrand (in Daumenreichweite). Oben rechts liegen vier Knöpfe: der Globus führt zur öffentlichen Website, der KÄFER ist »Problem melden / Feedback« (nimmt die aktuelle Seite als Herkunft mit), dann der Umschalter für helles/dunkles Design, dann das Nutzer-Icon mit Clubs, Konto, Wartungspläne, Problem melden, Kuratierung (nur Kuratoren), Administration (nur Super-Admins) und Abmelden.",
      },
    ],
  },
  {
    key: "uebersicht",
    titel: "Übersicht (Dashboard)",
    einleitung:
      "Der Einstieg nach dem Anmelden: was ist fällig, was ist offen, was ist nicht spielbereit — über alle deine Maschinen.",
    schritte: [
      {
        titel: "Kennzahlen",
        text: "Oben stehen fünf Kacheln in einer Reihe: Anzahl deiner Maschinen, wie viele davon NICHT spielbereit sind, die offenen Fehler, die anstehenden (bzw. fälligen) Wartungen und die anstehenden Termine — jeweils über alle Maschinen, die du siehst (eigene plus Club-Maschinen). Ein Klick auf eine Kachel springt zum passenden Abschnitt. Abschnitte ohne Einträge werden ausgeblendet; ist gar nichts offen, steht dort eine einzige Zeile »Alles erledigt«.",
      },
      {
        titel: "Nach Bereich filtern",
        text: "Bist du in mehreren Bereichen unterwegs — deine private Sammlung plus ein oder mehrere Clubs — erscheint eine Reihe Bereichs-Chips. Du kannst MEHRERE gleichzeitig aktiv lassen; Kennzahlen und Listen zeigen dann nur diese Bereiche. Sind alle aktiv, ist kein Filter gesetzt. Die Wahl gilt SEITENÜBERGREIFEND: Übersicht und Maschinenliste zeigen denselben Bereich, bis du ihn änderst.",
      },
      {
        titel: "Karten- oder Listenansicht",
        text: "Oben rechts schaltest du die Abschnitte zwischen kompakter Liste (dichte Zeilen — die Voreinstellung) und Kartenansicht (luftig) um; die Wahl bleibt gemerkt.",
      },
      {
        titel: "Betriebsstatus & Hinweise",
        text: "Zuerst die dringendste Lage: alle Maschinen, die nicht »Spielbereit« sind (also »Eingeschränkt« oder »Außer Betrieb«) — mit Grund und direktem Sprung zur Maschine. Dahinter stehen spielbereite Maschinen, an denen ein manueller Hinweis hängt (z. B. »EL-Inverter ersetzen, sobald Ersatz da«). In allen Listen der Übersicht steht das Gerät fett in der ersten Zeile, darunter Grund, Wartungspunkt, Termin oder Fehlerbeschreibung. Mehr zum Status im Abschnitt »Maschinen-Detailseite«.",
      },
      {
        titel: "Anstehende Wartung",
        text: "Fällige und bald fällige Wartungspunkte samt Maschine. Ein Klick führt direkt in den Wartungs-Reiter der jeweiligen Maschine.",
      },
      {
        titel: "Offene Fehler",
        text: "Alle noch nicht behobenen Fehler (offen, quittiert, in Arbeit) mit Priorität — ebenfalls direkt verlinkt. Wie in allen Listen der Übersicht steht das Gerät fett in der ersten Zeile, die Fehlerbeschreibung darunter.",
      },
      {
        titel: "Turniermodus (Club)",
        text: "Für Turniere: Owner/Admin eines Clubs starten ihn oben rechts über den Knopf »Turniermodus starten« (bei mehreren Clubs fragt ein Dialog, für welchen). Ist er aktiv und steht an einer Club-Maschine ein NEUER, noch nicht quittierter Fehler (Status »offen«), schlägt das Dashboard sichtbar Alarm. Sobald jeder betroffene Fehler mindestens auf »quittiert« gesetzt ist, verstummt der Alarm. Im Turniermodus lädt das Dashboard automatisch nach (~25 Sekunden), damit ein neuer Fehler den Alarm auch ohne Neuladen auslöst.",
      },
    ],
  },
  {
    key: "maschinen-liste",
    titel: "Maschinen",
    einleitung: "Deine Automaten anlegen, finden und verwalten.",
    schritte: [
      {
        titel: "Anlegen",
        text: "Maschinen → »Neue Maschine«. Wähle das Modell aus dem Katalog — Hersteller, Modell, Baujahr, Generation und Foto werden übernommen. Fehlt ein Modell im Katalog, legst du es über »Von Hand eintragen« selbst an. Ein eigenes Foto kannst du zusätzlich hochladen. Tipp: Die Modell-Auswahl verknüpft die Maschine mit dem Modell — nur damit lassen sich später Handbuch-Daten und Reparaturen teilen.",
      },
      {
        titel: "Filter & Ansichten",
        text: "In der Steuerzeile über der Liste liegen die Bereichs-Chips: »Privat« und einer je Club (mit Anzahl), mehrere gleichzeitig wählbar — dieselben wie im Kopf der Übersicht, und die Wahl gilt seitenübergreifend. Rechts wechselst du zwischen der Tabelle (kompakt, sortierbar — die Voreinstellung) und der Kartenansicht (mit Fotos und Badges). Die Tabelle zeigt auch, wann eine Maschine hinzugefügt wurde; eine Club-Spalte, die in allen Zeilen dasselbe sagen würde, blendet sie aus.",
      },
      {
        titel: "Suchen & sortieren",
        text: "Das Suchfeld (Hersteller/Modell, Enter sucht) steht in der Steuerzeile. Sortiert wird in der Tabelle direkt im Spaltenkopf: ein Klick auf »Modell«, »Baujahr« oder »Hinzugefügt« sortiert danach, ein zweiter Klick dreht die Richtung — der Pfeil zeigt sie an. Nur in der Kartenansicht gibt es dafür eine Auswahl mit Richtungspfeil.",
      },
      {
        titel: "Private Sammlung",
        text: "Ohne Club-Zuordnung gehört eine Maschine nur dir und ist auch nur für dich sichtbar.",
      },
      {
        titel: "Löschen",
        text: "Auf der Detailseite über »Löschen« — nur Eigentümer, Club-Owner/-Admin oder Super-Admin. Die Rückfrage sagt dir vorher, was ANDERE dabei verlieren: Fehler, Reparaturen und Wartungspunkte gehen mit der Maschine; Reparaturen, die du für alle oder für EINEN Club freigegeben hattest, bleiben als Tipp am Modell erhalten (anonym, wenn die Freigabe anonym war); Freigaben an einzelne Personen oder mehrere Clubs erlöschen; Handbuch-Daten, die noch an der Maschine statt am Modell hingen, wandern ans Modell. Mehrere Maschinen löschst du über »Verwalten« in der Liste.",
      },
    ],
  },
  {
    key: "maschinen-detail",
    titel: "Maschinen-Detailseite",
    einleitung:
      "Alles zu einer Maschine — gegliedert in drei Reiter-Gruppen mit Zählern.",
    schritte: [
      {
        titel: "Kopf, Übersicht & Reiter",
        text: "Ganz oben steht der Kopf mit Foto, Name, Betriebsstatus, den Datenbank-Kennungen (OPDB/IPDB) sowie Club und Besitzern — dazu QR-Code, Bearbeiten und Löschen; er bleibt immer sichtbar. Darunter öffnet die Detailseite mit der Übersicht: die Betriebsstatus-Karte (Status-Satz, seit wann, und für Bearbeiter »Status manuell setzen«), darunter sechs Kennzahl-Karten in einer Reihe (offene und kritische Fehler, letzte Wartung, Reparaturen, Handbuch, Guide — jede springt in ihren Reiter) und die offenen Fehler als kurze Liste. Über der Übersicht liegen drei Reiter: »Übersicht«, »Betrieb« (Fehler, Wartung) und »Wissensbasis« (Reparaturen, Handbuch, Guide, Tipps). Wählst du eine Gruppe, erscheint darunter eine schmale Unterreihe für ihre Bereiche. Reiter und Kennzahl-Karten tragen Zähler (z. B. offene Fehler, fällige Wartung); die Leiste bleibt beim Scrollen sichtbar.",
      },
      {
        titel: "Betriebsstatus",
        text: "Jede Maschine trägt einen Betriebsstatus: »Spielbereit«, »Eingeschränkt« oder »Außer Betrieb«. Normalerweise wird er automatisch aus den offenen Fehlern abgeleitet — ein offener KRITISCHER Fehler setzt die Maschine auf »Eingeschränkt«. Mit Schreibrecht lässt er sich auf der Übersicht der Maschine auch von Hand setzen (nur so gibt es »Außer Betrieb«); »Zurück auf Automatik« lässt ihn wieder den Fehlern folgen. Der Status-Badge im Seitenkopf und die »Maschinenstatus«-Karte verlinken direkt auf diese Steuerung. Der Grund einer Einschränkung wird auf der Geräteseite angezeigt — bei manueller Pinnung der eingetragene Grund, bei automatischer Einschränkung der auslösende kritische Fehler (verlinkt). Setzt du den Status manuell auf »Spielbereit« und trägst eine Begründung ein, bleibt sie als »Hinweis« auf der Status-Karte und in der Übersicht sichtbar — ein Merker für Dinge, die noch anstehen, ohne das Gerät einzuschränken; »Zurück auf Automatik« löscht ihn. Dieser Status steckt hinter der »nicht spielbereit«-Kennzahl der Übersicht.",
      },
      {
        titel: "Bearbeiten",
        text: "Über »Bearbeiten« änderst du Daten, Foto, Modell- und Club-Zuordnung sowie Besitzer und Ausstattung. Ein bereits gewähltes Modell wird dabei nur angezeigt (keine erneute Suche) — über »Anderes Modell wählen« oder »Manuell anpassen« änderst du es bei Bedarf. Beim Foto gehen JPG, PNG, WebP, GIF und AVIF bis 10 MB (zu große Dateien meldet das Feld sofort); am besten passt ein Querformat (etwa 5:3) — der Detail-Kopf zeigt das Foto ganz, die kleinen Vorschaubilder in Listen sind quadratische Ausschnitte. Beim Foto (wie bei jedem Upload) steht ein Urheberrechts-Hinweis: Wer hochlädt, ist für die Rechte verantwortlich. Verlässt du ein Formular mit ungespeicherten Änderungen — über »Abbrechen« oder irgendeinen Link —, fragt ein Dialog »Weiter bearbeiten / Verwerfen / Speichern«; still verworfen wird nichts.",
      },
      {
        titel: "Besitzer",
        text: "Jede Maschine kann BESITZER tragen — die Personen, denen das Gerät tatsächlich gehört (nicht zwingend, wer es angelegt hat); auch mehrere, z. B. bei gemeinsam angeschafften Geräten. Das ist rein informativ und vergibt keine Rechte. Zur Auswahl stehen bisherige Besitzer-Namen (je Club bzw. privat — einmal angelegt, wieder wählbar), die MITGLIEDER des Clubs (ist der Besitzer schon Nutzer, wird sein Konto direkt verknüpft) oder ein neuer Name mit optionaler E-Mail. Hat ein Besitzer eine E-Mail und noch kein Konto, können Club-Owner/-Admins ihn direkt von der Detailseite in den Club einladen; nimmt er an, wird sein Konto automatisch mit dem Besitzer-Eintrag verknüpft.",
      },
      {
        titel: "Ausstattung",
        text: "Neben den Besitzern kannst du je Gerät festhalten, was zusätzlich verbaut oder dabei ist — Shaker, Topper, farbige LEDs, Ersatz-Gummisatz und dergleichen. Jeder Eintrag hat einen Namen und optional eine kurze Notiz (keine Kategorie). Gepflegt wird die Ausstattung beim Anlegen oder Bearbeiten der Maschine (im Formular, wie die Besitzer); im Kopf der Detailseite wird sie nur angezeigt, alphabetisch sortiert. Rein informativ — vergibt keine Rechte.",
      },
    ],
  },
  {
    key: "fehler",
    titel: "Fehler erfassen",
    einleitung:
      "Ein Fehler ist das Symptom an einer Maschine — er kann auch ganz ohne Reparatur bestehen.",
    schritte: [
      {
        titel: "Melden",
        text: "Auf der Maschinen-Detailseite im Reiter »Fehler« auf »Neuer Fehler«. Beschreibe das Symptom und wähle optional eine Kategorie (Spule, Schalter, Beleuchtung, Anzeige, Elektrik, Elektronik, Mechanik, Baugruppe, Software, Sonstiges), eine Priorität (niedrig, mittel, hoch, kritisch) und den Status. Direkt beim Anlegen kannst du ein oder mehrere FOTOS anhängen — am Handy wahlweise mit der Kamera oder aus der Galerie; sie erscheinen später als Vorschau am Fehler. Ein offener KRITISCHER Fehler setzt die Maschine automatisch auf »Eingeschränkt« (siehe Betriebsstatus).",
      },
      {
        titel: "Status & Filter",
        text: "Der Status durchläuft offen → quittiert → in Arbeit → behoben (»quittiert« = zur Kenntnis genommen, aber noch nicht behoben; zählt weiterhin als offener Fehler). Über die Chips oben lässt sich die Fehlerliste nach Status filtern.",
      },
      {
        titel: "Gut zu wissen",
        text: "Das Symptom lebt am Fehler und wird nie an die Reparatur dupliziert — Fehler und Reparatur sind bewusst getrennt.",
      },
      {
        titel: "KI-Reparaturvorschlag",
        text: "Zu jedem Fehler kannst du mit Schreibrecht einen KI-Reparaturvorschlag holen: am Fehler auf »Reparatur«, dann oben auf der Seite »Neue Reparatur« Anbieter wählen und »Vorschlag von der KI holen«. Die KI nutzt das Symptom, das Modell und das hinterlegte Wissen (Handbuch-Fakten, Troubleshooting-Guide) und trägt Diagnose, Maßnahme und Teile direkt ins Formular ein (der Fehler ist schon angehakt). Prüfe und passe alles an, bevor du speicherst: der Vorschlag ist ein Startpunkt und ersetzt nicht Manual und Schaltplan.",
      },
      {
        titel: "Per QR-Code melden — auch ohne Konto",
        text: "Jede Maschine hat ein QR-Etikett (Detailseite → »QR-Code«, drucken und ans Gerät kleben). Wer den Code scannt, landet auf einer öffentlichen Melde-Seite: Angemeldete mit Zugriff kommen direkt in den Fehler-Reiter; alle anderen — auch Gäste ganz ohne Konto — beschreiben das Symptom, geben nur ihren Namen an (erscheint als »… (Gast)«) und können ebenfalls Fotos anhängen. Priorität und Status vergibt anschließend der Betreiber. Der Eigentümer einer PRIVATEN Maschine bekommt bei jeder Fremd-Meldung eine E-Mail (höchstens alle 30 Minuten je Gerät); für Club-Maschinen gibt es die WhatsApp-Benachrichtigung an Owner/Admins. Ein Login ist der bevorzugte Weg, aber keine Voraussetzung.",
      },
      {
        titel: "Sammel-QR — ein Code für eine ganze Sammlung",
        text: "Statt (oder zusätzlich zu) einem Etikett je Gerät gibt es einen Sammel-QR für eine ganze Sammlung: für einen Club (Club-Seite → »Sammel-QR«) und für deine private Sammlung (Konto → »Logo & Sammel-QR«). Wer diesen Code scannt, wählt zuerst das Gerät aus einer alphabetischen Liste (ab sechs Geräten mit Suchfeld) und meldet dann dafür. Weil hier NICHT der Code direkt am Gerät gescannt wurde, trägt so eine Meldung das Kennzeichen »Sammel-QR« — ein Hinweis, dass der Melder das Gerät aus einer Liste gewählt hat und evtl. nicht davorstand.",
      },
      {
        titel: "QR-Code drucken — Druck-Studio",
        text: "Auf der QR-Seite steht ein Druck-Studio, das den Code MASSSTABSGETREU druckt. Zwei Kartenformen: ein EIGENES Etikett mit frei wählbaren Maßen (Breite×Höhe in mm, Hoch-/Querformat) oder eine SCORECARD in herstellerspezifischen Kartenmaßen (das passende Format wird anhand des Herstellers vorgeschlagen, ist frei änderbar). Zwei Seitenmodi: exakt in Kartengröße (für Etiketten-/Kartendrucker) oder auf A4 mit SCHNITTMARKEN zum Ausschneiden (jeder Bürodrucker). Im A4-Modus lassen sich weitere Karten auf den Bogen legen — einzeln über die Suche oder mit »Alle meine Maschinen hinzufügen« die ganze Sammlung auf einmal (neue Geräte beim nächsten Druck einfach wieder mit aufnehmen). Zuschaltbar sind Name, Hinweistext und ein Logo (oben, links oder rechts vom Code) — bei Club-Maschinen das Club-Logo, bei privaten Maschinen dein persönliches Logo (Konto → »Logo & Sammel-QR«); die Schriftgröße ist regelbar. Deine Einstellungen werden gemerkt, sodass das nächste Etikett gleich so vorbelegt ist.",
      },
      {
        titel: "Mehrere Karten auf eine A4-Seite",
        text: "Im A4-Modus kannst du zusätzlich WEITERE Maschinen suchen und ihre Karten mit auf die Seite (bzw. auf Folgeseiten) drucken — praktisch, um viele Etiketten in einem Rutsch zu erzeugen. Daneben gibt es weiterhin den Bild-Download (PNG/SVG) für Bildbearbeitung oder Druckerei. Tipp: im Druckdialog die Papiergröße auf die angezeigten Maße (bzw. A4) stellen und Ränder auf 0.",
      },
    ],
  },
  {
    key: "reparaturen",
    titel: "Reparaturen",
    einleitung: "Was wurde gemacht — mit optionaler Verknüpfung zu Fehlern.",
    schritte: [
      {
        titel: "Erfassen",
        text: "Auf der Maschinen-Detailseite im Reiter »Reparaturen« auf »Neue Reparatur«. Trage Diagnose, Maßnahme, verbaute Teile, Kosten und Zeitaufwand ein.",
      },
      {
        titel: "Mit Fehlern verknüpfen",
        text: "Eine Reparatur kann einen oder MEHRERE Fehler beheben — einfach die zutreffenden Fehler ankreuzen. Wird die Reparatur auf »erledigt« gesetzt, springen alle verknüpften Fehler automatisch auf »behoben«.",
      },
      {
        titel: "Historie",
        text: "Alle Reparaturen einer Maschine stehen chronologisch auf ihrer Detailseite.",
      },
    ],
  },
  {
    key: "wartungsplan",
    titel: "Wartungsplan",
    einleitung:
      "Wiederkehrende Wartungen je Gerät planen, abhaken und im Blick behalten — mit Fälligkeit, Historie und Erinnerung.",
    schritte: [
      {
        titel: "Punkte anlegen",
        text: "Auf der Maschinen-Detailseite im Reiter »Wartung«: die Maschine mit einem Standard-Wartungsplan verknüpfen (aus deinen Plänen und den Plänen deiner Clubs im Dropdown wählen — »Verknüpfen« folgt dem Standard, »Als Kopie übernehmen« macht daraus eigene Punkte), »Aus Guide übernehmen« (zieht Punkte aus dem Troubleshooting-Guide) oder »Neuer Wartungspunkt« für eigene Einträge. Jeder Punkt ist eine Zeile mit Fälligkeit, Intervall, letzter und nächster Wartung; rechts sitzen Häkchen (Erledigt eintragen), Stift und Papierkorb. Erledigte Wartung trägst du je Punkt über das Häkchen ein — oder über »Mehrere erledigen« gleich mehrere Punkte auf einmal (Datum heute vorbelegt).",
      },
      {
        titel: "Standard-Wartungspläne",
        text: "Unter Nutzer-Icon → »Wartungspläne« legst du BELIEBIG VIELE benannte Pläne an — eigene (privat) und je Club, den du managst (Owner/Admin bearbeiten, Mitglieder nutzen sie). »Neuer Plan« fragt nach einem Namen und optional »aus Standardvorlage«. Die STANDARDVORLAGE ist bewusst umfassend — rund 20 Punkte aus Community-Erfahrung — und als Inspiration gedacht, nicht als Pflichtprogramm: Du übernimmst sie als Kopie und kürzt oder ergänzt nach Geschmack; aus 20 Punkten werden dann je nach Gerät und Anspruch vielleicht 5, vielleicht alle 20. Danach passt du die Punkte über Stift und Papierkorb an jeder Zeile bzw. »Punkt hinzufügen« an, benennst den Plan um (Stift am Namen) oder löschst ihn (verknüpfte Maschinen werden dabei entkoppelt — ihre Punkte werden eigene Kopien, die Historie bleibt). Die Pläne liegen hinter Reitern.",
      },
      {
        titel: "Verknüpfen oder kopieren?",
        text: "Verknüpfst du eine Maschine mit einem Standard, folgen ihre Punkte dem Standard: Änderungen dort wirken sofort auf allen verknüpften Maschinen; solche Punkte tragen den Badge »Standard«, Stift und Papierkorb sind an der Maschine deaktiviert (der Tooltip sagt warum) — bearbeitet wird im Standard; Erledigt-Einträge und Historie bleiben natürlich an der Maschine. »Standard als Kopie übernehmen« legt stattdessen freie, editierbare Kopien an. Über »Verknüpfung lösen« werden alle Punkte einer verknüpften Maschine zu eigenen Kopien. Vorhandene gleichnamige Punkte behalten beim Verknüpfen ihre Historie.",
      },
      {
        titel: "Intervall & Fälligkeit",
        text: "Nur zeitbasierte Punkte (z. B. »alle 30 Tage«) bekommen einen Termin und eine Fälligkeits-Anzeige: »heute fällig«, »überfällig seit N Tagen« oder gelb »in N Tagen« für die nächsten 14 Tage. Gezählt wird tageweise — ein Punkt, der heute dran ist, gilt den ganzen Tag als fällig, nicht erst ab der Uhrzeit. Spielzahl- und Bedarf-Punkte sind reine Checkliste ohne Termin.",
      },
      {
        titel: "Erledigt eintragen",
        text: "Das Häkchen an einem Wartungspunkt öffnet »Erledigt eintragen« (Datum heute vorbelegt, optionale Notiz). Der Eintrag landet in der Historie und verschiebt die nächste Fälligkeit automatisch um das Intervall.",
      },
      {
        titel: "Historie",
        text: "»Historie (n)« an jedem Wartungspunkt öffnet die Liste aller Erledigungen samt vollständiger Beschreibung des Punkts; einzelne Einträge lassen sich dort löschen (die Fälligkeit wird dann neu berechnet).",
      },
      {
        titel: "Erinnerungen",
        text: "Fällige Wartungen erscheinen als Badge auf der Maschinenkachel, im Wartungsplan und auf der Übersicht. Zusätzlich verschickt die App eine E-Mail-Erinnerung an den Eigentümer, sobald zeitbasierte Punkte fällig sind.",
      },
    ],
  },
  {
    key: "termine",
    titel: "Termine",
    einleitung:
      "Datierte Ereignisse je Gerät — einmalig oder wiederkehrend — mit E-Mail-Erinnerung im Vorlauf. Für alles mit einem Datum, das kein wiederkehrender Wartungs-Check ist: Batteriewechsel, TÜV/Prüfung, Rückgabetermin, Garantieende.",
    schritte: [
      {
        titel: "Anlegen",
        text: "Auf der Maschinen-Detailseite im Reiter »Termine« → »Neuer Termin«. Du gibst einen Titel (z. B. »Batterie wechseln«), ein Datum und optional eine Notiz an. Der Termin gehört zum Gerät und taucht dort sowie in der globalen Agenda auf.",
      },
      {
        titel: "Einmalig oder wiederkehrend",
        text: "Lässt du »Wiederholen« leer, ist der Termin einmalig. Trägst du eine Monatszahl ein (z. B. 24), wiederholt er sich alle N Monate — nach »Erledigt« rückt das Datum automatisch um das Intervall weiter, statt zu verschwinden. Fällt der Zieltag auf einen kürzeren Monat, wird auf dessen letzten Tag geklemmt (31.01. + 1 Monat → 28./29.02.).",
      },
      {
        titel: "Erinnerung (Vorlauf)",
        text: "Je Termin legst du fest, wie viele Tage im Voraus erinnert wird (Standard 7). Sobald »Datum minus Vorlauf« erreicht ist, verschickt die App eine E-Mail an den Eigentümer — gebündelt pro Gerät. Ein erneuter Lauf am selben Termin schickt nichts nach (kein Spam).",
      },
      {
        titel: "Erledigt",
        text: "»Erledigt« schließt einen einmaligen Termin ab (er verschwindet aus der Liste). Bei einem wiederkehrenden Termin rückt das Datum stattdessen um das Intervall weiter und der Termin bleibt offen.",
      },
      {
        titel: "Fälligkeit & Agenda",
        text: "Termine zeigen »heute fällig«, »überfällig seit N Tagen« oder »in N Tagen« (tageweise gezählt, Europe/Berlin). Der Menüpunkt »Termine« listet alle anstehenden Termine über deine Geräte chronologisch, nächster zuerst; die Übersicht zeigt sie zusätzlich als eigenen Abschnitt und als Kennzahl (fällige rot).",
      },
    ],
  },
  {
    key: "dokumente",
    titel: "Dokumente",
    einleitung:
      "Links, Notizen und Dateien je Gerät — Nachschlage- und Belegmaterial direkt an der Maschine (Datenblätter, Rechnungen, Fotos vom Innenleben, eigene Service-Notizen).",
    schritte: [
      {
        titel: "Anlegen",
        text: "Auf der Maschinen-Detailseite unter »Wissensbasis« → Reiter »Dokumente« → »Hinzufügen«. Dann die Art wählen: Link, Notiz oder Datei. Titel ist immer Pflicht; eine Notiz kann bei Link und Datei zusätzlich als Beschreibung dienen.",
      },
      {
        titel: "Links & Notizen",
        text: "Ein Link speichert Titel + Web-Adresse (z. B. OPDB-Eintrag, ein Video oder Datenblatt) und öffnet in einem neuen Tab. Fehlt bei der Adresse das »https://«, wird es automatisch ergänzt. Eine Notiz ist freier Text mit einfacher Formatierung — über die Knöpfe über dem Feld (fett, kursiv, Aufzählung, Link) oder direkt getippt (**fett**, _kursiv_, Bindestrich am Zeilenanfang, [Text](URL)); »Vorschau« zeigt das Ergebnis vor dem Speichern. Notizen werden in der Liste formatiert angezeigt.",
      },
      {
        titel: "Dateien hochladen",
        text: "Erlaubt sind PDF, Bilder (JPG/PNG/WebP/GIF/AVIF) sowie DOCX/XLSX/PPTX und TXT/CSV, bis 25 MB je Datei. Der Dateityp wird an den echten Dateibytes geprüft, nicht am Namen. Vor dem Hochladen bestätigst du, dass du die Datei speichern darfst; der Urheberrechts-Hinweis darunter gilt für jeden Upload in der App. Hinweis: Handbücher gehören nicht hierher — die liest du über »Handbuch«/»Guide« ein (sie werden dort nicht als Datei abgelegt, sondern nur die extrahierten Fakten).",
      },
      {
        titel: "Bearbeiten & Löschen",
        text: "Titel und Notiz lassen sich jederzeit ändern; die Art (Link/Notiz/Datei) bleibt fix. Bei einer Datei kannst du optional eine neue Datei hochladen — die alte wird dabei ersetzt. »Löschen« entfernt den Eintrag, und bei Dateien wird die Datei auch wirklich aus dem Speicher gelöscht.",
      },
      {
        titel: "Wer sieht die Dokumente?",
        text: "Dokumente gehören zum Gerät: Wer Zugriff auf die Maschine hat, sieht sie (auch bei geteilten Maschinen). Hinzufügen, Bearbeiten und Löschen können nur Personen mit Schreibrecht — bei einer reinen Freigabe zum Lesen erscheinen die Knöpfe nicht.",
      },
    ],
  },
  {
    key: "clubs-rollen",
    titel: "Clubs & Rollen",
    einleitung:
      "Clubs teilen Maschinen mit mehreren Mitgliedern. Du kannst in mehreren Clubs sein und behältst dabei deine private Sammlung. Ohne Club bist du ein »User« mit deiner eigenen Sammlung; wer ganz ohne Konto per QR-Code einen Fehler an einer Maschine meldet, ist ein »Gast«.",
    schritte: [
      {
        titel: "Club erstellen",
        text: "Nutzer-Icon → Clubs → »Neuer Club«. Als Ersteller wirst du automatisch Owner.",
      },
      {
        titel: "Vereins-Logo",
        text: "Beim Erstellen oder später auf der Club-Seite (Abschnitt »Logo«, Owner/Admin) lässt sich ein Logo hochladen — JPG, PNG oder SVG. Es erscheint im Club-Kopf und kann beim Download des QR-Etiketts wahlweise links oder rechts neben den Code ins Bild integriert werden.",
      },
      {
        titel: "Mitglieder einladen",
        text: "Auf der Club-Seite (als Owner oder Admin) öffnet »Mitglied einladen« neben der Überschrift einen Dialog: E-Mail eingeben, Rolle wählen und »Einladen«. Der Empfänger bekommt eine E-Mail mit Beitritts-Link. Offene Einladungen stehen unter der Mitgliederliste und lassen sich über den Papierkorb zurückziehen; verfallene tauchen dort nicht mehr auf.",
      },
      {
        titel: "Rollen",
        text: "Owner: volle Kontrolle — Mitglieder & Einladungen verwalten, zum Owner befördern, Club löschen. Admin: Mitglieder & Einladungen verwalten, aber nicht zum Owner befördern oder den Club löschen. Mitglied: sieht und pflegt die Club-Maschinen. Diese Rollen gelten immer für GENAU DIESEN Club — du kannst in mehreren Clubs sein und dort jeweils eine andere Rolle haben (und zusätzlich eine globale wie Kurator). Das Info-Icon neben »Mitglieder« zeigt die Erklärung jederzeit direkt im Club.",
      },
      {
        titel: "Rolle ändern",
        text: "Als Owner oder Admin öffnet der Stift am Zeilenende der Mitgliederliste einen Dialog, in dem du die neue Rolle wählst und speicherst; der Papierkorb entfernt das Mitglied, am eigenen Eintrag steht stattdessen »Verlassen«. Die Owner-Rolle kann nur ein Owner vergeben oder entziehen. Beim letzten Owner sind Stift, Papierkorb und Verlassen ausgegraut und sagen warum — erst jemand anderen zum Owner befördern.",
      },
      {
        titel: "Owner-Regel",
        text: "Ein Club braucht immer mindestens einen Owner. Der letzte Owner kann sich nicht degradieren oder austreten, ohne vorher jemanden zum Owner zu befördern.",
      },
      {
        titel: "Verlassen",
        text: "Über »Verlassen« in der Mitgliederliste trittst du selbst aus einem Club aus.",
      },
    ],
  },
  {
    key: "maschinen-teilen",
    titel: "Maschinen im Club teilen",
    einleitung: "So werden Automaten für ein ganzes Team sichtbar.",
    schritte: [
      {
        titel: "Zuordnen",
        text: "Maschine »Bearbeiten« → einen Club auswählen. Danach sehen alle Club-Mitglieder die Maschine samt ihren Fehlern und Reparaturen.",
      },
      {
        titel: "Mehrere auf einmal zuweisen",
        text: "Auf der Maschinenliste »Verwalten« → Maschinen anhaken (oder »Alle auswählen«), Ziel-Club wählen und »Zuweisen«. Praktisch, wenn Geräte vor dem Club angelegt wurden. Maschinen, die schon im gewählten Club sind, werden als »bereits zugewiesen« markiert. Umhängen darf nur, wer die Maschine auch löschen dürfte (Eigentümer, Club-Owner/-Admin); andere werden übersprungen. »Fertig« verlässt den Verwalten-Modus wieder.",
      },
      {
        titel: "Mehrere auf einmal löschen",
        text: "Dieselbe Leiste: »Verwalten« → Maschinen anhaken und »Löschen«; eine Rückfrage bestätigt. Achtung: Das löscht die Maschinen samt allen Fehlern, Reparaturen und Wartungen endgültig. Was du daraus für andere freigegeben hattest, bleibt als Tipp am Modell erhalten (öffentlich bzw. für den einen Club; Freigaben an einzelne Personen oder mehrere Clubs erlöschen), und Handbuch-Daten, die nur an der Maschine hingen, wandern ans Modell — beim Löschen einer einzelnen Maschine zählt die Rückfrage das genau auf. Löschen darf nur, wer es auch einzeln dürfte (Eigentümer, Club-Owner/-Admin); andere werden übersprungen.",
      },
      {
        titel: "Sichtbarkeit",
        text: "Du siehst deine eigenen Maschinen plus die aller Clubs, in denen du Mitglied bist.",
      },
      {
        titel: "Beim Löschen eines Clubs",
        text: "Die Maschinen werden nicht gelöscht, sondern nur vom Club gelöst — sie bleiben beim Eigentümer.",
      },
    ],
  },
  {
    key: "handbuch-daten",
    titel: "Handbuch-Daten",
    einleitung:
      "Aus deinem eigenen Handbuch technische Referenztabellen gewinnen — ohne Copyright-Verletzung.",
    schritte: [
      {
        titel: "Hochladen",
        text: "Auf der Maschinen-Detailseite im Reiter »Handbuch« öffnet der Knopf »Handbuch auswerten« (rechts oben) eine eigene Seite. Standardweg ist »In der App«: bestätigen, dass du das Handbuch besitzt bzw. die Rechte hast, das PDF wählen und auswerten. Anbieter, Detailstufe und Sichtbarkeit liegen unter »Erweiterte Optionen« — für den Normalfall musst du sie nicht anfassen.",
      },
      {
        titel: "Was passiert",
        text: "Die KI liest das PDF und extrahiert ausschließlich Faktentabellen (Spulen, Schalter-/Lampen-Matrix, Sicherungen, Teile, Regeln, Schrauben, Gummiteile, Elektronik-Bauteile). Das PDF wird dabei NIE gespeichert — nur die Fakten landen in der Datenbank, als Wissenseintrag am Modell. Der Handbuch-Reiter erklärt das Prinzip gleich im Kopf; solange noch nichts da ist, zeigt »Vorschau: so sehen Handbuch-Daten aus« mit erfundenen Beispielwerten, wie das Ergebnis aussehen wird.",
      },
      {
        titel: "Der Prompt-Weg (für alle)",
        text: "Der Weg für alle Nutzer: Auf der Seite »Handbuch auswerten« steht »Eigenes ChatGPT-/Claude-Abo« — den vorbereiteten Prompt kopieren, im eigenen KI-Abo zusammen mit dem Handbuch-PDF ausführen und NUR das JSON hier einfügen. »Prüfen« zeigt eine Vorschau samt Warnungen und gibt gezielte Tipps für den nächsten Versuch — inklusive einer kopierbaren Nachfrage, die du in denselben Chat einfügst (z. B. wenn die Ausgabe abgeschnitten war oder Tabellen fehlen). Die aufklappbare Anleitung im Dialog nennt geeignete Modelle; kostenlose Konten liefern vermutlich kein brauchbares Ergebnis (kleinere Modelle, kein PDF-Upload, abgeschnittene Antworten). Erst nach erfolgreicher Prüfung wird importiert.",
      },
      {
        titel: "Node-Systeme (Stern SPIKE u. ä.)",
        text: "Nicht jedes Gerät hat eine Schalter-/Lampen-MATRIX. Moderne Plattformen wie Stern SPIKE, neuere JJP oder Spooky adressieren Schalter und Lampen einzeln an Nodes — im Handbuch stehen dann Kennungen wie »8-SW-17« oder »8-LP-24« und Lampennummern bis weit über 88. Der Prompt sagt dem Modell ausdrücklich: dann Column/Row leer lassen und nichts erfinden. Die Prüfung erkennt das und meldet »Node-System (keine Matrix — so richtig)« statt einer fehlenden Matrix; auch die Nachfrage verlangt dann keine Rasterpositionen. Solche Tabellen erscheinen als normale Tabelle, nicht als Raster — das ist korrekt.",
      },
      {
        titel: "Wer darf was (KI)",
        text: "Die KI-Verarbeitung IN DER APP (Handbuch auswerten, Guide erzeugen, Wartungspunkte aus dem Guide) ist dem Betreiber vorbehalten — die Kosten je Durchlauf sind nicht planbar (Euro, nicht Cent). Für alle anderen ist der Prompt-Weg der Weg: Prompt kopieren, im eigenen KI-Abo ausführen, JSON einfügen — dort kostet derselbe Durchlauf nichts extra. Das kann sich künftig ändern; dazu müssen aber erst Entscheidungen zu Sponsoring oder zur Annahme von Spenden getroffen werden. Die Knöpfe bzw. Reiter für die App-Verarbeitung sind für dich ausgegraut und nennen den Grund. Einzige Ausnahme: der KI-Reparaturvorschlag beim Anlegen einer Reparatur läuft für alle über den Schlüssel des Betreibers (kleiner, planbarer Aufruf). Einen eigenen Anthropic-Schlüssel kann nur der Betreiber hinterlegen (selbst gehostete Installationen; dort alternativ ein lokales Modell über Ollama oder MLX). Der Betreiber kann unter Konto → »KI in der App« den Plattform-Schlüssel für sich abschalten und dann bewusst den Prompt-Weg gehen — so, wie alle anderen ihn sehen.",
      },
      {
        titel: "Ansehen",
        text: "Alle Faktentabellen stehen offen da; Switch- und Lampen-Matrix erscheinen als farbcodiertes Raster (WPC-Draht-Farbcodes, Opto-Schalter markiert). Die Kennzahl-Karten oben sind Sprunglinks zu den Tabellen; ein Klick auf den Tabellenkopf klappt eine lange Tabelle zu. Tabellen mit einer Typ-Spalte lassen sich filtern.",
      },
    ],
  },
  {
    key: "troubleshooting-guide",
    titel: "Troubleshooting-Guide",
    einleitung:
      "Ein FAQ- und Reparatur-Leitfaden für genau dein Modell — von der KI erzeugt oder als JSON importiert.",
    schritte: [
      {
        titel: "Wo",
        text: "Der Guide-Reiter auf der Maschinen-Detailseite ist mit Schreibrecht immer sichtbar. Wer nur lesen darf, sieht ihn, sobald Handbuch-Daten oder Guides vorliegen. Solange noch kein Guide da ist, zeigt »Vorschau: so sieht ein Guide aus« mit einem erfundenen WPC-95-Beispiel, was dich erwartet (Plattform, Abschnitte mit Warnungen, Text und Tabellen, Quellen).",
      },
      {
        titel: "Erstellen",
        text: "Im Reiter »Guide« öffnet »Guide erstellen« (nur mit Schreibrecht) einen Dialog mit zwei Wegen: »Per KI erzeugen« oder »JSON importieren«. Beim KI-Weg (nur Betreiber, siehe »Handbuch-Daten → Wer darf was«) bestimmt die KI zunächst die Plattform bzw. Geräte-Generation und prüft sie samt bekannter Serienfehler per Websuche gegen Community-Quellen (IPDB, PinWiki, Pinside). Das dauert ein bis zwei Minuten.",
      },
      {
        titel: "Der Prompt-Weg (für alle)",
        text: "Wie bei den Handbuch-Daten: Im Dialog »Guide erstellen« ist »JSON importieren« der Weg für alle — den vorbereiteten Prompt kopieren (er enthält bereits Hersteller, Modell und Baujahr), im eigenen KI-Abo mit eingeschalteter Websuche ausführen und NUR das JSON hier einfügen. »Prüfen« zeigt eine Vorschau samt Warnungen und Tipps (zu wenige Abschnitte, keine Quellen, abgeschnitten …) mit einer kopierbaren Nachfrage für denselben Chat; erst dann wird importiert. Der Import ersetzt deinen bisherigen Guide auf der gewählten Ebene — der alte Stand wandert in den Verlauf. Importierte Guides sind als »Importiert (extern erstellt)« gekennzeichnet. »Per KI erzeugen« in der App ist dem Betreiber vorbehalten.",
      },
      {
        titel: "Gültigkeit: Modell oder Generation",
        text: "Hat das Modell eine Geräte-Generation (z. B. WPC-95), wählst du beim Erstellen bzw. Import: »Nur dieses Modell« oder »Ganze Generation«. Ein Generation-Guide erscheint automatisch bei ALLEN Modellen dieser Generation — praktisch für plattformweite Themen wie Boards und Netzteile.",
      },
      {
        titel: "Was drinsteht",
        text: "Plattformspezifische Sicherheitshinweise, systematische Fehlersuche nach Subsystemen (als Symptom-/Diagnose-Tabellen), bekannte Modellprobleme, Wege ins Diagnose-/Testmenü, ein FAQ, ein Wartungsplan und eine Werkzeug-/Ersatzteilliste — dazu Quellen zum Gegenprüfen.",
      },
      {
        titel: "Neu erstellen",
        text: "Gibt es schon einen eigenen Guide, heißt der Knopf »Guide ersetzen« — derselbe Dialog erzeugt oder importiert den Leitfaden neu. Der bisherige Stand geht dabei nicht verloren — er wandert in den Verlauf des Eintrags (siehe »Wissenseinträge bearbeiten & Verlauf«).",
      },
      {
        titel: "Wichtig",
        text: "Der Guide ist KI-generiert bzw. extern erstellt. Vor sicherheitsrelevanten Arbeiten immer mit dem Original-Manual und dem Schaltplan gegenprüfen.",
      },
    ],
  },
  {
    key: "wissensbasis-modelle",
    titel: "Wissensbasis (Modelle)",
    einleitung:
      "Geteiltes Wissen lebt am Modell — sichtbar auch für Nutzer, die selbst kein Exemplar besitzen.",
    schritte: [
      {
        titel: "Der Katalog",
        text: "»Wissensbasis« in der Navigation zeigt alle Modelle, zu denen für dich Wissen sichtbar ist (eigenes plus geteiltes). Voreingestellt ist eine Tabelle: ein Klick auf »Modell«, »Baujahr« oder »Generation« sortiert danach, ein zweiter Klick dreht die Richtung um. Oben rechts schaltest du auf Karten mit Foto um; die Wahl bleibt gemerkt. Beide Ansichten nennen die Anzahl der Einträge. Baugleiche Editionen einer Maschine (z. B. Premium und LE — gleiche ersten zwei Teile der OPDB-Kennung) teilen ihr Wissen und erscheinen als ein Eintrag mit »auch …«; die Modellseite nennt sie unter »Baugleich mit«. Die Pro-Ausführung ist eine andere Maschine.",
      },
      {
        titel: "Modellseite",
        text: "Die Modellseite bündelt alles zu einem Modell in Reitern: Handbuch-Daten, Troubleshooting-Guide, Tipps und geteilte Reparaturen — jeweils mit Anzahl und einem kurzen Hinweis je Reiter, wie der Bereich funktioniert (für Handbuch und Guide reicht meist EIN Eintrag, Tipps und Reparaturen ergänzen sich). Eigene Einträge lassen sich hier genauso verwalten wie auf der Maschinen-Detailseite.",
      },
      {
        titel: "Drei Ebenen",
        text: "Wissen hängt an einer von drei Ebenen: an der Geräte-Generation (gilt für alle Modelle der Generation), am Modell (Normalfall, edition-genau) oder an einer einzelnen Maschine (nur wenn sie kein Modell hat). Handbuch-Fakten bleiben bewusst modell-genau, weil sich Editionen (Pro/Premium) unterscheiden.",
      },
      {
        titel: "Allgemeine Tipps",
        text: "Im Reiter »Tipps« (Maschine wie Modellseite) sammelst du frei formulierte Hinweise — z. B. Wartungskniffe oder bekannte Schwachstellen. Der Text erlaubt eine einfache FORMATIERUNG: **fett**, _kursiv_, Aufzählungen mit einem Bindestrich am Zeilenanfang und Links als [Text](URL) — reine URLs werden automatisch anklickbar. Zusätzlich lassen sich weiterführende LINKS mit optionalem Namen und kurzer Beschreibung anhängen. Die Knöpfe über dem Textfeld setzen die Formatierung für dich, »Vorschau« zeigt das Ergebnis. Ein Tipp kann anders als übriges Wissen MEHRERE Modelle und/oder ganze Generationen zugleich betreffen. »Tipp hinzufügen« öffnet eine eigene Seite, und die Ziel-Auswahl fragt in Stufen — vom Nahen zum Fernen: zuerst DIESES Gerät (vorausgewählt), dann weitere Editionen desselben Titels (z. B. Pro ↔ Premium/LE), dann — aufklappbar, mit Suche — andere Modelle, und getrennt davon ganze Generationen (die Generation deines Geräts steht vorn). Rechts oben schaltest du zwischen Karten- und kompakter Listenansicht um; die Wahl bleibt gemerkt. Jeder Tipp zeigt »gilt für …«, trägt eine Sichtbarkeit und lässt sich wie andere Einträge bewerten und ausblenden; eigene Tipps tragen im Kopf Stift (Bearbeiten) und Papierkorb (Löschen mit Rückfrage). Tipps mit »Anonym geteilt« sind aus einer anonymen Reparatur-Freigabe entstanden, deren Maschine gelöscht wurde (siehe »Wissen teilen & Community«).",
      },
    ],
  },
  {
    key: "wissen-teilen",
    titel: "Wissen teilen & Community",
    einleitung:
      "Handbuch-Daten, Guides und Reparaturen mit anderen Besitzern teilen — und gemeinsam die Qualität sichern.",
    schritte: [
      {
        titel: "Sichtbarkeit je Wissenseintrag",
        text: "Handbuch-Daten und Guides tragen eine Sichtbarkeit: »privat« (nur du), »Club« oder »öffentlich« (alle angemeldeten Nutzer — kein Zugriff aus dem offenen Internet). Du wählst sie beim Erzeugen bzw. Import; am eigenen Eintrag änderst du sie über das Auswahlfeld »Sichtbar:« im Kopf — die Wahl wird sofort gespeichert. Jeder Eintrag zeigt seinen Autor.",
      },
      {
        titel: "Reparaturen teilen",
        text: "Rechts an jeder Reparatur sitzt das Teilen-Symbol; es öffnet den Teilen-Dialog. Eine geteilte Reparatur trägt den Chip »Geteilt: …«, und dasselbe Symbol öffnet dann die Freigabe zum Ändern oder Aufheben (mit Rückfrage). Standardmäßig anonym und ohne Kosten/Aufwand — beides lässt sich je Eintrag umschalten. Reichweiten: alle angemeldeten Nutzer, bestimmte Clubs oder bestimmte Personen per E-Mail. Die Vorschau zeigt exakt, was andere lesen.",
      },
      {
        titel: "Wenn die Maschine gelöscht wird",
        text: "Reparaturen sterben mit ihrer Maschine — eine geteilte Reparatur aber nicht ganz: Beim Löschen wird sie zu einem TIPP am Modell befördert (Symptom, Diagnose, Maßnahme, Teile; Kosten nur, wenn die Freigabe sie zeigte). Freigabe für alle → öffentlicher Tipp; Freigabe für genau EINEN Club → Club-Tipp; Freigaben an einzelne Personen oder mehrere Clubs lassen sich nicht verlustfrei abbilden und erlöschen — die Löschfrage zählt beides vorher auf. War die Freigabe anonym, ist es der Tipp auch (»Anonym geteilt«). Eine einzelne Reparatur zu löschen befördert dagegen nichts: Löschen heißt Löschen.",
      },
      {
        titel: "Was du siehst",
        text: "Geteilte Einträge anderer erscheinen im Reiter »Handbuch« bzw. »Guide« der Maschine und auf der Modellseite in der Wissensbasis — jeweils mit Autor und Sichtbarkeit. Geteilte Reparaturen stehen im Reiter »Reparaturen« unter »Geteiltes Wissen«.",
      },
      {
        titel: "Bewerten: hilfreich oder falsch",
        text: "Fremde Einträge kannst du als »hilfreich« oder »falsch« markieren (ein Signal je Nutzer, jederzeit änderbar). Melden mehrere Nutzer einen Eintrag als falsch, erscheint für alle ein Warnhinweis — automatisch verborgen wird dabei nichts.",
      },
      {
        titel: "Für dich ausblenden",
        text: "Fremde Einträge, die dich nicht interessieren, blendest du über »Ausblenden« für dich aus — übrig bleibt eine Zeile mit »Einblenden«. Das ist rein persönlich und ändert für andere nichts.",
      },
      {
        titel: "Von Kuratoren verborgen",
        text: "Kuratoren können problematische geteilte Einträge für alle verbergen — immer mit Begründung. Betrifft es deinen Eintrag, siehst du ihn weiterhin, markiert mit dem Grund; für andere ist er unsichtbar, bis ein Kurator ihn wiederherstellt.",
      },
      {
        titel: "Voreinstellungen",
        text: "Unter Konto → »Freigabe-Voreinstellungen« legst du fest, was beim Teilen vorbelegt ist, und ob neue Handbuch-Daten/Reparaturen automatisch freigegeben werden. Für Club-Maschinen gilt die Voreinstellung des Clubs (Club-Seite, nur Owner/Admin). Im Einzelfall ist alles übersteuerbar.",
      },
    ],
  },
  {
    key: "eintrag-bearbeiten",
    titel: "Wissenseinträge bearbeiten & Verlauf",
    einleitung:
      "Eigene Handbuch-Daten und Guides direkt korrigieren — jede Änderung landet nachvollziehbar im Verlauf.",
    schritte: [
      {
        titel: "Bearbeiten",
        text: "Im Kopf jedes eigenen Eintrags sitzt ein Stift; er öffnet den Editor als Dialog: bei Handbuch-Daten und Guides änderst du Titel und Inhalt als JSON (gleiche Struktur wie beim Import), »Prüfen« validiert die Eingabe, erst dann ist Speichern möglich. Tipps bearbeitest du direkt als Text samt ihrer Links. »Speichern« bleibt ausgegraut, solange sich nichts gegenüber dem gespeicherten Stand geändert hat. Optional gibst du einen Kommentar zur Änderung an.",
      },
      {
        titel: "Verlauf",
        text: "Der Link »Verlauf (n)« im Kopf des Eintrags öffnet alle früheren Stände in einem Dialog — mit Datum, Bearbeiter, Kommentar und dem kompletten alten Inhalt. Den Verlauf sieht nur der Autor.",
      },
      {
        titel: "Bewertungen bleiben erhalten",
        text: "Auch beim Neu-Auswerten, Neu-Importieren oder Neu-Generieren wird der Eintrag aktualisiert statt ersetzt: Bewertungen der Community und der Verlauf bleiben erhalten, der alte Stand wird automatisch gesichert.",
      },
    ],
  },
  {
    key: "konto-profil",
    titel: "Konto & Sicherheit",
    einleitung:
      "Dein Profil, deine E-Mail-Adresse, dein Passwort, deine Einladungen und Clubs.",
    schritte: [
      {
        titel: "Konto öffnen",
        text: "Nutzer-Icon oben rechts → »Konto«.",
      },
      {
        titel: "Profil",
        text: "Im Abschnitt »Profil« pflegst du Name, Vorname/Nachname, optionale Initialen (bis zu drei Buchstaben, wie beim Highscore) und ein Profilbild. Das Bild (oder deine Initialen) erscheint als Avatar in der Navigation. Für Profilbild und Logo gilt wie für jeden Upload: Du bist für die Rechte am Bild verantwortlich.",
      },
      {
        titel: "E-Mail-Adresse ändern",
        text: "Im Abschnitt »E-Mail-Adresse« die neue Adresse eintragen. Zur Sicherheit geht ein Bestätigungslink an deine BISHERIGE Adresse — erst nach dem Klick darauf wird gewechselt.",
      },
      {
        titel: "Einladungen",
        text: "Offene Club-Einladungen kannst du hier annehmen oder ablehnen.",
      },
      {
        titel: "Clubs verlassen",
        text: "Unter »Meine Clubs« siehst du deine Clubs samt Rolle und kannst sie über »Verlassen« verlassen. Bist du letzter Owner, musst du vorher jemanden zum Owner befördern — bis dahin ist der Knopf ausgegraut und sagt warum.",
      },
      {
        titel: "Logo & Sammel-QR (private Sammlung)",
        text: "Unter »Logo & Sammel-QR« hinterlegst du ein persönliches Logo (JPG, PNG oder SVG) — es erscheint auf den QR-Etiketten deiner privaten Maschinen und deiner Sammlung. Darunter führt ein Link zum druckbaren Sammel-QR deiner privaten Sammlung: ein Code, über den man (auch ohne Konto) eines deiner privaten Geräte aus einer Liste wählt und dafür einen Fehler meldet.",
      },
      {
        titel: "WhatsApp bei neuen Fehlern",
        text: "Unter »WhatsApp-Benachrichtigung« hinterlegst du deine Nummer (Format +49151…) und schaltest die Benachrichtigung PRO CLUB per Häkchen ein — das speichert sofort. Danach bekommst du eine WhatsApp, sobald an einer Maschine dieses Clubs ein neuer Fehler gemeldet wird — auch bei Gast-Meldungen per QR-Code. Nur Owner/Admins eines Clubs können das aktivieren; ohne hinterlegte Nummer geht trotz aktivem Schalter nichts raus. Damit es nicht spammt, wird je Maschine höchstens alle 30 Minuten eine Nachricht geschickt.",
      },
      {
        titel: "Passwort ändern",
        text: "Unter »Sicherheit«: aktuelles Passwort, neues Passwort und Wiederholung — gleiche Regeln, mit Anzeigen/Verbergen. Darunter löscht »Konto löschen« nach Eingabe deiner E-Mail-Adresse das Konto unwiderruflich.",
      },
      {
        titel: "Freigabe-Voreinstellungen",
        text: "Hier legst du fest, was beim Teilen von Handbuch-Daten und Reparaturen vorbelegt wird (Reichweite, anonym, Kosten) und ob automatisch freigegeben wird. Details siehe Abschnitt »Wissen teilen & Community«.",
      },
      {
        titel: "Passwort vergessen",
        text: "Auf der Anmeldeseite »Passwort vergessen?« → du erhältst eine E-Mail mit einem Reset-Link.",
      },
      {
        titel: "KI in der App (nur Betreiber)",
        text: "Super-Admins sehen zusätzlich den Abschnitt »KI in der App«: ein Schalter, ob die KI-Verarbeitung in der App über den Plattform-Schlüssel genutzt wird. Aus heißt: die Oberfläche zeigt sich genau so wie für alle anderen Nutzer — dieselben Sperren, derselbe Wortlaut — und der Prompt-Weg ist der Weg. Praktisch, um die App mit den Augen der Nutzer zu sehen. Der Reparaturvorschlag bleibt in beiden Fällen verfügbar.",
      },
    ],
  },
  {
    key: "feedback",
    titel: "Probleme melden & Feedback",
    einleitung:
      "Etwas in der App funktioniert nicht oder dir fehlt eine Funktion? Sag es uns direkt aus der App heraus.",
    schritte: [
      {
        titel: "Melden",
        text: "Am schnellsten über den KÄFER oben rechts in der Kopfzeile — er nimmt die Seite, auf der du gerade bist, als Herkunft mit; alternativ Nutzer-Icon → »Problem melden«. Die Seite hat Reiter: »Neue Meldung« (Typ Fehler oder Verbesserungsvorschlag, Titel, Beschreibung, optional Screenshot), »Meine Meldungen« und — für Super-Admins — »Alle Meldungen«. Seite, App-Version und Browser werden automatisch mitgeschickt; du musst nichts davon heraussuchen.",
      },
      {
        titel: "Was passiert dann?",
        text: "Die Betreiber werden benachrichtigt und sichten die Meldung. Unter »Meine Meldungen« siehst du jederzeit den Status (offen → in Arbeit → erledigt, oder zurückgestellt bzw. verworfen) und eine eventuelle Antwort. Sobald deine Meldung abgeschlossen wird (erledigt/zurückgestellt/verworfen), bekommst du zusätzlich eine E-Mail mit dem Ergebnis.",
      },
      {
        titel: "Gut zu wissen",
        text: "Fehler AN EINER MASCHINE (z. B. »linker Flipper prellt«) gehören nicht hierher, sondern als Fehler auf die Maschinen-Detailseite — dieses Formular ist für die App selbst.",
      },
      {
        titel: "Was uns wirklich hilft",
        text: "Am wertvollsten sind konkrete Beobachtungen aus dem echten Gebrauch — besonders vom Prompt-Weg: Was hat das Modell geliefert, was hat die Prüfung gesagt, was stimmte nicht? Ein Beispiel: Beim Auswerten eines Stern-SPIKE-Handbuchs merkte ein Nutzer an, dass Schalter und Lampen dort einzeln an Nodes hängen (»8-SW-17«) und es gar keine Matrix gibt — die Prüfung verlangte trotzdem Rasterpositionen. Diese eine Notiz hat den Prompt, die Prüfung und die Tipps verbessert. Solche Rückmeldungen bitte als »Verbesserungsvorschlag« mit dem Modell/Gerät und, wenn möglich, dem betroffenen Textausschnitt schicken.",
      },
    ],
  },
  {
    key: "tipps",
    titel: "Tipps",
    einleitung: "Kleinigkeiten, die den Alltag leichter machen.",
    schritte: [
      {
        titel: "Mobil nutzen",
        text: "Die App ist für unterwegs gedacht — erfasse Fehler und Reparaturen direkt an der Maschine.",
      },
      {
        titel: "Hell/Dunkel",
        text: "Über den Umschalter in der Navigation zwischen hellem und dunklem Design wechseln.",
      },
      {
        titel: "Formatierung in Texten",
        text: "Tipp-Texte und Dokument-Notizen verstehen eine einfache Formatierung: **fett**, _kursiv_, Aufzählungen mit Bindestrich am Zeilenanfang und Links als [Text](URL). Die Knöpfe über dem Feld setzen das für dich; »Vorschau« zeigt das Ergebnis.",
      },
      {
        titel: "Ungespeicherte Änderungen",
        text: "Verlässt du ein Formular mit Änderungen — egal über welchen Link —, fragt die App nach: weiter bearbeiten, verwerfen oder speichern. Nur beim Schließen des Tabs oder Neuladen der Seite warnt sie nicht.",
      },
      {
        titel: "Handbuch als PDF",
        text: "Diese Anleitung gibt es oben rechts auch als PDF zum Herunterladen — praktisch zum Weitergeben oder für die Werkstatt ohne Netz. Der Einstiegs-Leitfaden ist darin das erste Kapitel.",
      },
    ],
  },
];

/* ── Admin-Hilfe (/help/admin — Super-Admins & Kuratoren) ─────────────────── */

export const ADMIN_HILFE: HilfeSektion[] = [
  {
    key: "nutzer-rollen",
    titel: "Nutzer & globale Rollen",
    nurSuperAdmin: true,
    einleitung:
      "Zwei Achsen: globale Rollen (Super-Admin, Kurator) und Club-Rollen (immer in einem Club) — eine Person kann mehrere halten. Dazu die Grundstufen Gast und User.",
    schritte: [
      {
        titel: "Zugang",
        text: "Super-Admins finden »Administration« im Nutzer-Menü oben rechts. Weitere Super-Admins lassen sich dort ernennen; der letzte Super-Admin bleibt geschützt und kann nicht entfernt werden. Neue Konten entstehen NUR über Einladungen (Plattform-Einladung durch dich oder Club-Einladung durch Owner/Admins) — eine offene Selbstregistrierung gibt es nicht; die Startseite verweist auf »Zugang anfragen«.",
      },
      {
        titel: "KI-Zugang",
        text: "Die KI-Verarbeitung in der App (Handbuch auswerten, Guide erzeugen, Wartungspunkte aus dem Guide) läuft über den Plattform-Schlüssel und ist Super-Admins vorbehalten — für alle anderen ist der Prompt-Weg der Weg; der Reparaturvorschlag ist die eine Ausnahme für alle. Einen eigenen Anthropic-Schlüssel darf nur ein Super-Admin mitgeben. Unter Konto → »KI in der App« kannst du den Plattform-Schlüssel für dich abschalten und die App exakt so sehen wie ein Nutzer. Die Regel steht in lib/ki-zugang.ts; Route und Actions prüfen sie serverseitig, die gesperrten Knöpfe nennen den Grund.",
      },
      {
        titel: "Rollen je Nutzer verwalten",
        text: "Es gibt zwei Achsen: GLOBALE Rollen (Super-Admin, Kurator — plattformweit) und CLUB-Rollen (Owner/Admin/Mitglied — immer in genau einem Club). Eine Person kann mehrere halten: verschiedene Rollen in verschiedenen Clubs plus globale. Die Nutzerseite hat zwei Ansichten (Umschalter rechts oben): Karten zeigen unter jeder Person jede Zuweisung als Zeile mit Stift (Club-Rolle ändern) und Papierkorb (entziehen); die Liste zeigt die Rollen kompakt als Chips, und der Stift am Zeilenende klappt dieselbe Bearbeitung auf; »Rolle hinzufügen« öffnet einen Dialog: erst »Wo?« (Plattform oder ein Club), dann die passende Rolle. Was nicht geht — letzter Owner, letzter Super-Admin — ist ausgegraut und sagt warum. (Club-Rollen lassen sich weiterhin auch direkt im jeweiligen Club vergeben.)",
      },
      {
        titel: "Konto löschen (Admin)",
        text: "Der Papierkorb am Nutzer löscht dessen Konto unwiderruflich — derselbe Weg wie die Selbst-Löschung unter »Konto«: private Maschinen samt Fotos werden gelöscht, in Clubs geteilte Inhalte bleiben erhalten und gehen auf dich als handelnden Super-Admin über. Ist die Person alleiniger Owner eines Clubs, wird abgelehnt — erst die Ownerschaft übertragen. Das eigene Konto ist hier gesperrt.",
      },
      {
        titel: "Grundrollen: Gast & User",
        text: "Der Rollen-Katalog nennt zwei Grundrollen, die nirgends vergeben werden, weil es sie ohnehin gibt: »Gast« ist, wer OHNE Konto per QR-Code einen Fehler an einer Maschine meldet (der Aufkleber ist das Melde-Recht). »User« ist ein angemeldetes Konto ohne Club-Rolle — besitzt und pflegt eigene (private) Maschinen und sieht keine fremden Club-Maschinen. Beide stehen nur zur Orientierung im Katalog.",
      },
      {
        titel: "Kurator (Moderation der Wissensbasis)",
        text: "Die Kurator-Rolle vergibst du im selben Nutzer-Block. Kuratoren moderieren die geteilten Wissenseinträge (siehe Abschnitt »Kuratierung«); private Einträge bleiben für sie unsichtbar. Rollen kombinieren sich — jemand kann z. B. Kurator UND Owner eines Clubs sein.",
      },
      {
        titel: "Rollen-Katalog",
        text: "Unten auf der Nutzer-Seite steht der Rollen-Katalog, nach Achsen gegliedert: Grundstufen (Gast/User, nicht zuweisbar), Club-Rollen (immer in einem Club) und Globale Rollen. Rollen sind Daten (kein fester Code) — das Info-Icon neben Vergabe-Stellen zeigt die Beschreibungen überall in der App.",
      },
      {
        titel: "Sichtbarkeits-Debug",
        text: "Die Debug-Seite /admin/visibility/<Nutzer-ID> zeigt, welche Maschinen ein Nutzer aktuell sehen kann — hilfreich, wenn jemand etwas vermisst. Sie ist bewusst nicht verlinkt (ein temporäres Werkzeug).",
      },
    ],
  },
  {
    key: "plattform-einladungen",
    titel: "Nutzer einladen",
    nurSuperAdmin: true,
    einleitung:
      "Registrieren kann sich jeder selbst. Eine Einladung von hier erspart der Person die E-Mail-Bestätigung.",
    schritte: [
      {
        titel: "Einladen",
        text: "Unter »Nutzer einladen« die E-Mail eingeben — die Person erhält einen Registrierungslink. Optional kannst du eine persönliche Nachricht mitschicken. Diese Einladung ordnet keinem Club zu; dafür lädst du zusätzlich im jeweiligen Club ein.",
      },
      {
        titel: "Offene Einladungen",
        text: "Offene Einladungen stehen darunter und lassen sich jederzeit zurückziehen. Einladungen verfallen automatisch nach 7 Tagen.",
      },
      {
        titel: "Einladungs-Rundmail: Text in der App, mehrere auf einmal",
        text: "Administration → »Einladungs-Rundmail«: Dort pflegst du den Einladungstext (Betreff und Einleitungstext der Vorlage »Einladung zur Plattform« — Klartext mit Absätzen; Web-Adressen werden automatisch anklickbar; der Knopf »Konto erstellen« mit dem persönlichen Link und der Gültigkeitshinweis kommen automatisch darunter), siehst eine Vorschau genau so, wie die Mail ankommt, schickst dir eine Testmail — und trägst dann die Adressen ein, eine je Zeile (auch Komma oder Semikolon). Jede Person bekommt ihren eigenen Link; das Ergebnis nennt je Adresse, ob verschickt, übersprungen (Konto vorhanden) oder gespeichert ohne Versand. Alles landet im Protokoll unter »Mails«, offene Einladungen stehen auf der Administrations-Seite.",
      },
    ],
  },
  {
    key: "email-vorlagen",
    titel: "E-Mail-Vorlagen",
    nurSuperAdmin: true,
    einleitung: "Betreff und Einleitungstext der Einladungsmails anpassen.",
    schritte: [
      {
        titel: "Anpassen",
        text: "Unter »E-Mail-Vorlagen« passt du Betreff und Einleitungstext an — mit Platzhaltern wie {{einlader}} und {{clubname}} sowie einer Vorschau. Der Button mit dem Einladungslink und der Gültigkeitshinweis bleiben fest, damit eine Vorlage den Link nicht versehentlich entfernt.",
      },
      {
        titel: "Zurücksetzen",
        text: "»Zurücksetzen« stellt den Standardtext wieder her — gespeichert werden nur Abweichungen vom Standard.",
      },
    ],
  },
  {
    key: "clubs-verwalten",
    titel: "Clubs verwalten",
    nurSuperAdmin: true,
    einleitung: "Überblick über alle Clubs der Plattform.",
    schritte: [
      {
        titel: "Einsehen & löschen",
        text: "Unter »Clubs« stehen alle Clubs mit Mitgliederzahl. Ein Club lässt sich hier löschen (mit Bestätigung) — seine Maschinen werden dabei nicht gelöscht, sondern nur vom Club gelöst und bleiben beim jeweiligen Eigentümer.",
      },
      {
        titel: "Grundsatz",
        text: "Ein Super-Admin darf grundsätzlich alles verwalten — auch innerhalb einzelner Clubs (Mitglieder, Rollen, Maschinen).",
      },
    ],
  },
  {
    key: "modelle-generationen",
    titel: "Modelle & Generationen",
    nurSuperAdmin: true,
    einleitung:
      "Die Kataloge hinter der Wissensbasis: Modelle (edition-genau) und Geräte-Generationen (Board-Systeme).",
    schritte: [
      {
        titel: "Modelle",
        text: "Unter »Modelle« steht der Modell-Katalog (Hersteller, Modell, Baujahr, OPDB-Referenz, Generation) — sortier- und filterbar. Die Generation eines Modells änderst du über das Stift-Icon; manuell gesetzte Generationen sind vor automatischen Importen geschützt.",
      },
      {
        titel: "Generationen",
        text: "Unter »Generationen« pflegst du die Board-System-Liste (z. B. WPC-95, Stern SPIKE 2) mit Hersteller und Zeitraum. Die Modellzahl je Generation ist ein Link auf die entsprechend gefilterte Modell-Liste; umbenennen und löschen geht über die Icons rechts in der Zeile. Wissen auf Generation-Ebene (z. B. ein Guide) erscheint automatisch bei allen Modellen der Generation.",
      },
    ],
  },
  {
    key: "kuratierung",
    titel: "Kuratierung",
    einleitung:
      "Moderation der geteilten Wissensbasis — für Kuratoren und Super-Admins.",
    schritte: [
      {
        titel: "Zugang & Sichtweite",
        text: "»Kuratierung« findest du im Nutzer-Menü oben rechts. Als Kurator siehst du alle GETEILTEN Wissenseinträge (Club und öffentlich) — auch fremder Clubs; private Einträge bleiben privat.",
      },
      {
        titel: "Gemeldete Einträge",
        text: "Die Kuratierungs-Seite listet Einträge, die von der Community mehrfach als falsch gemeldet wurden (mindestens 2×, mehr »falsch« als »hilfreich«). Die Meldung ist rein anzeigend — nichts wird automatisch verborgen. Zum Prüfen dem Link zum Eintrag folgen.",
      },
      {
        titel: "Verbergen — nur mit Begründung",
        text: "Direkt am Eintrag (Modell- oder Maschinenseite) gibt es für Kuratoren »Verbergen«: Eine Begründung ist Pflicht, ohne sie wird nichts verborgen. Danach ist der Eintrag für alle unsichtbar — nur der Autor sieht ihn weiterhin, markiert mit Kurator, Datum und Grund. Kein stilles Zensieren.",
      },
      {
        titel: "Wiederherstellen",
        text: "Verborgene Einträge stehen auf der Kuratierungs-Seite und lassen sich dort (oder direkt am Eintrag) mit Bestätigung wiederherstellen — der Eintrag ist danach wieder für alle sichtbar.",
      },
    ],
  },
  {
    key: "feedback-verwaltung",
    titel: "Feedback-Meldungen sichten",
    einleitung:
      "Fehlermeldungen und Verbesserungsvorschläge der Nutzer — sichtbar für Super-Admins.",
    schritte: [
      {
        titel: "Wo",
        text: "Nutzer-Icon → »Problem melden« führt zur Seite Feedback & Fehlermeldungen. Super-Admins sehen dort zusätzlich »Alle Meldungen« — mit Melder, Beschreibung und dem automatisch erfassten Kontext (Seite, App-Version, Browser).",
      },
      {
        titel: "Triage (nur Super-Admins)",
        text: "Über das Stift-Icon einer Meldung lassen sich Status (offen → in Arbeit → erledigt, zusätzlich zurückgestellt und verworfen) und eine Antwort in einem Dialog setzen — beides sieht der Melder unter »Meine Meldungen«. Wird eine Meldung ABGESCHLOSSEN (erledigt/zurückgestellt/verworfen), bekommt der Melder automatisch eine E-Mail mit dem Ergebnis. Die Liste »Alle Meldungen« lässt sich nach Status filtern (Chips). Bei einer neuen Meldung geht automatisch eine E-Mail an alle Super-Admins; erledigte oder gegenstandslose Meldungen können gelöscht werden.",
      },
      {
        titel: "Versand-Protokoll",
        text: "Unter jeder Meldung stehen die dazu verschickten Mails (wann, an wen, welcher Text). Das komplette Protokoll ALLER System-Mails (Einladungen, Passwort-Reset, Wartungs-Erinnerungen, Feedback-Benachrichtigungen, Fehler-Mails an Eigentümer privater Maschinen) findest du unter Administration → »Mail-Protokoll«, nach Kategorie filterbar. Unter Administration → »WhatsApp« liegt entsprechend das Protokoll der WhatsApp-Fehler-Benachrichtigungen; oben steht, ob der echte Versand aktiv ist oder nur mitprotokolliert wird.",
      },
    ],
  },
  {
    key: "prompts",
    titel: "KI-Prompts (Refinery)",
    nurSuperAdmin: true,
    einleitung:
      "Die Prompts der KI-Funktionen bearbeiten, testen und optimieren — ohne neuen Deploy.",
    schritte: [
      {
        titel: "Wo & was",
        text: "Administration → »Prompts«. Editierbar sind die Prompts für den Troubleshooting-Guide, die Handbuch-Extraktion, die Wartungspunkte-aus-Guide und den Reparaturvorschlag. Der Standard liegt im Code; hier speicherst du nur Abweichungen. Strukturelle Teile (die JSON-Ausgabeform, die Fakten-Spalten) bleiben bewusst fest, damit ein Edit das Auswerten der Antwort nie brechen kann. Die Prompts des PROMPT-WEGS (die Nutzer kopieren) sind Code, kein Override: die Handbuch-Vorlage in lib/import-facts.ts (IMPORT_PROMPT), die Guide-Vorlage in lib/import-guide.ts — Rückmeldungen aus echten Läufen (z. B. die Node-Systeme bei Stern SPIKE) landen dort.",
      },
      {
        titel: "Platzhalter behalten",
        text: "In den Prompts stehen Platzhalter wie {{hersteller}}, {{modell}}, {{symptom}} oder {{wissen}} — sie werden beim Aufruf mit den echten Gerätedaten gefüllt. Diese Platzhalter MÜSSEN erhalten bleiben, sonst fehlen dem Modell die Angaben.",
      },
      {
        titel: "Global oder pro Hersteller/Generation",
        text: "Jeder Prompt gilt global — du kannst aber zusätzlich eigene Fassungen pro Hersteller oder pro Geräte-Generation hinterlegen (»Override hinzufügen«). Beim Aufruf gewinnt die spezifischste Fassung: Generation vor Hersteller vor global, sonst der Code-Standard. Über »Override löschen« bzw. »Auf Standard zurücksetzen« geht es zurück.",
      },
      {
        titel: "Testen & verbessern (Refinery)",
        text: "Je Prompt gibt es die aufklappbare »Refinery«: ein Test-Lauf an Beispiel-Werten (der Prompt wird gerendert und durch das Modell geschickt, du siehst die Ausgabe) und »Prompt verbessern lassen« (die KI schlägt eine überarbeitete Fassung vor, die alle Platzhalter behält — mit »In den Editor übernehmen«). Beides kostet Tokens und nutzt die gewählte KI-Anbieter-Wahl.",
      },
    ],
  },
  {
    key: "betrieb",
    titel: "Betriebs-Hinweise",
    nurSuperAdmin: true,
    einleitung:
      "Das Wichtigste für den laufenden Betrieb — Details im Tab »Aufbau & Betrieb«.",
    schritte: [
      {
        titel: "Datenbank-Migrationen",
        text: "Schema-Änderungen werden mit »npm run db:migrate« eingespielt — immer über die DIREKTE Datenbank-URL (Port 5432), nicht über den Connection-Pooler.",
      },
      {
        titel: "Wartungs-Erinnerungen",
        text: "Die E-Mail-Erinnerungen für fällige Wartungen laufen über einen Cron-Job, abgesichert mit der Umgebungsvariable CRON_SECRET.",
      },
      {
        titel: "Mehr",
        text: "Die komplette Aufbau- und Betriebs-Dokumentation (Hosting, Umgebungsvariablen, Dienste, gelernte Stolperfallen) steht im Hilfe-Tab »Aufbau & Betrieb«.",
      },
    ],
  },
];

/* ── Einstieg (/help/einstieg — Leitfaden je Zielgruppe) ──────────────────── */
/*
  Der Einstieg ist bewusst LEICHT: erst das Allgemeine, dann genau EIN Weg je
  Zielgruppe (Solo-Sammler:in, Club-Mitglied, Club-Owner/-Admin), dann für alle
  die KI ehrlich erklärt, „Tiefer einsteigen" für die, die wollen, und wie man
  Rückmeldungen gibt. Die Zielgruppen-Sektionen tragen `zielgruppe`, die Seite
  zeigt davon nur die gewählte; das PDF druckt alle.
*/
export type Zielgruppe = "sammler" | "mitglied" | "owner";

export const ZIELGRUPPEN: { key: Zielgruppe; label: string }[] = [
  { key: "sammler", label: "Solo-Sammler:in" },
  { key: "mitglied", label: "Club-Mitglied" },
  { key: "owner", label: "Club-Owner / -Admin" },
];

export const EINSTIEG: (HilfeSektion & { zielgruppe?: Zielgruppe })[] = [
  {
    key: "einstieg-worum",
    titel: "Worum es geht",
    einleitung:
      "Der Pinball Manager ist eine Betriebs- und Wissensdatenbank für Flipperautomaten: Fehler, Reparaturen, Wartung und Termine je Gerät — und geteiltes Wissen je Modell.",
    schritte: [
      {
        titel: "Zwei Hälften",
        text: "Die BETRIEBS-Hälfte gehört dir bzw. deinem Club: Welche Maschine hat welchen Fehler, was wurde repariert, was ist zur Wartung fällig, welche Termine stehen an. Die WISSENS-Hälfte hängt am Modell und kann geteilt werden: Handbuch-Daten (Spulen, Schalter, Sicherungen …), ein Troubleshooting-Guide, Tipps und freigegebene Reparaturen anderer Besitzer desselben Modells.",
      },
      {
        titel: "Hineinkommen",
        text: "Es gibt keine offene Registrierung — du kommst über eine Einladung herein (von einem Club oder vom Betreiber; auf der Startseite steht »Zugang anfragen«). Der Link aus der E-Mail legt dein Konto an.",
      },
      {
        titel: "Die Kopfzeile",
        text: "Links die Hauptbereiche: »Übersicht« (was ist offen, fällig, nicht spielbereit), »Maschinen« (deine Geräte), »Termine«, »Wissensbasis« (Wissen je Modell) und »Hilfe«. Rechts der Globus (öffentliche Website), der Käfer (Problem melden / Feedback), Hell/Dunkel und dein Nutzer-Menü. Auf dem Handy liegen die Hauptbereiche unten in Daumenreichweite.",
      },
      {
        titel: "In zehn Minuten startklar",
        text: "1. Maschinen → »Neue Maschine«, Modell aus dem Katalog wählen. 2. Auf der Detailseite unter »Betrieb« den ersten Fehler eintragen (oder gleich das QR-Etikett drucken und ans Gerät kleben). 3. Wenn etwas repariert ist: Reparatur erfassen, Fehler abhaken. Alles Weitere — Wartungsplan, Dokumente, Handbuch-Daten, Clubs — kommt, wenn du es brauchst.",
      },
    ],
  },
  {
    key: "einstieg-sammler",
    zielgruppe: "sammler",
    titel: "Für Solo-Sammler:innen",
    einleitung:
      "Du hast eigene Geräte und keinen Club? Dann ist das dein Weg — alles bleibt privat, nichts davon muss geteilt werden.",
    schritte: [
      {
        titel: "Deine private Sammlung",
        text: "Ohne Club-Zuordnung gehört jede Maschine nur dir und ist nur für dich sichtbar. Die Übersicht ist dein Cockpit: nicht spielbereite Geräte, offene Fehler, fällige Wartung.",
      },
      {
        titel: "Fehler am Gerät — auch für Besuch",
        text: "Druck das QR-Etikett der Maschine (Kopf der Detailseite → »QR-Code«) und kleb es ans Gerät. Wer es scannt, meldet einen Fehler mit Foto — ohne Konto; du bekommst dazu eine E-Mail (höchstens alle 30 Minuten je Gerät). Für die ganze Sammlung gibt es unter Konto → »Logo & Sammel-QR« EINEN Code mit deinem Logo, hinter dem man das Gerät aus einer Liste wählt.",
      },
      {
        titel: "Wartung ohne Zettel",
        text: "Im Wartungs-Reiter »Neuer Wartungspunkt« oder gleich einen eigenen Wartungsplan anlegen (Nutzer-Menü → »Wartungspläne« → »Neuer Plan«, Häkchen »aus Standardvorlage«) und mit der Maschine verknüpfen. Die Standardvorlage ist umfassend — rund 20 Punkte — und als Inspiration gedacht: kopieren, dann auf das kürzen, was zu dir und deinem Gerät passt; aus 20 werden je nach Geschmack 5 bis 20. Die Übersicht sagt dir, was fällig ist.",
      },
      {
        titel: "Alles zum Gerät an einem Ort",
        text: "Unter »Wissensbasis« der Maschine: Dokumente (Rechnungen, Datenblätter, Notizen), Handbuch-Daten aus deinem eigenen Handbuch (über den Prompt-Weg mit deinem KI-Abo — siehe Abschnitt »Die KI, ehrlich erklärt«), ein Troubleshooting-Guide und Tipps.",
      },
      {
        titel: "Was du NICHT brauchst",
        text: "Keinen Club, kein Teilen, keine Rollen. Wenn du willst, profitierst du trotzdem von anderen: Die Wissensbasis zeigt dir öffentliches Wissen zu deinen Modellen — und deine eigenen Einträge bleiben privat, solange du sie nicht freigibst.",
      },
    ],
  },
  {
    key: "einstieg-club-mitglied",
    zielgruppe: "mitglied",
    titel: "Für Club-Mitglieder",
    einleitung:
      "Dein Club betreut Geräte gemeinsam. Als Mitglied siehst du die Club-Maschinen und hilfst beim Betrieb — die Verwaltung liegt bei Owner und Admins.",
    schritte: [
      {
        titel: "Beitreten und Bereich wählen",
        text: "Die Einladung kommt per E-Mail (oder liegt unter Konto → »Einladungen«). Danach siehst du in Übersicht und Maschinenliste Bereichs-Chips: »Privat« für deine eigenen Geräte und einen je Club — du kannst mehrere gleichzeitig aktiv lassen; die Wahl gilt seitenübergreifend.",
      },
      {
        titel: "Was du an Club-Maschinen darfst",
        text: "Fehler melden (mit Priorität und Foto), Fehler quittieren und bearbeiten, Reparaturen eintragen, Wartungspunkte erledigen, Termine anlegen, Dokumente pflegen — kurz: alles, was den Betrieb betrifft. Nicht dein Bereich: die Club-Zuordnung einer Maschine ändern oder sie löschen (Owner/Admin).",
      },
      {
        titel: "Turniermodus verstehen",
        text: "Startet ein Owner/Admin den Turniermodus, schlägt die Übersicht bei jedem NEUEN, noch nicht quittierten Fehler Alarm — quittieren heißt hier »gesehen, kümmere mich«. Sobald jeder neue Fehler quittiert ist, ist Ruhe.",
      },
      {
        titel: "Wissen aus dem Club",
        text: "Handbuch-Daten, Guides und Tipps, die jemand für den Club freigegeben hat, siehst du automatisch an den Club-Maschinen und in der Wissensbasis — mit Autor und Sichtbarkeit. Deine eigenen Beiträge gibst du selbst frei (privat, Club oder öffentlich).",
      },
      {
        titel: "Benachrichtigung aufs Handy",
        text: "Unter Konto → »WhatsApp-Benachrichtigung« kannst du dich je Club benachrichtigen lassen, sobald ein neuer Fehler gemeldet wird — sofern du dort Owner/Admin bist; als Mitglied genügt der Blick in die Übersicht.",
      },
    ],
  },
  {
    key: "einstieg-club-owner",
    zielgruppe: "owner",
    titel: "Für Club-Owner und -Admins",
    einleitung:
      "Du richtest den Club ein und hältst ihn am Laufen: Mitglieder, Rollen, Maschinen, Wartungsstandards — und ein paar Regeln, die es zu kennen lohnt.",
    schritte: [
      {
        titel: "Club anlegen und Leute holen",
        text: "Nutzer-Menü → »Clubs« → »Club erstellen« (Name, optional Logo). Dann Mitglieder per E-Mail einladen — mit Rolle: Owner (alles, inkl. Club löschen), Admin (verwalten) oder Mitglied (Betrieb). Wer noch kein Konto hat, bekommt es über den Einladungslink.",
      },
      {
        titel: "Maschinen in den Club",
        text: "Beim Anlegen oder Bearbeiten einer Maschine den Club wählen — oder in der Maschinenliste »Verwalten«: anhaken, Ziel-Club wählen, »Zuweisen«. Club-Maschinen sehen alle Mitglieder; die Zuordnung ändern und löschen dürfen nur Owner/Admins und der Eigentümer.",
      },
      {
        titel: "Wartung als Standard",
        text: "Unter Nutzer-Menü → »Wartungspläne« legst du je Club eigene Pläne an und verknüpfst Maschinen damit — Änderungen am Plan wirken dann überall. Guter Start ist die Standardvorlage (Häkchen bei »Neuer Plan«): rund 20 Punkte, bewusst umfassend und als Inspiration gedacht — der Club kürzt sie auf seinen Rhythmus, aus 20 werden vielleicht 8. Einzelne Geräte können zusätzlich eigene Punkte haben.",
      },
      {
        titel: "Freigaben und Voreinstellungen",
        text: "Auf der Club-Seite legst du fest, was beim Teilen von Handbuch-Daten und Reparaturen für Club-Maschinen vorbelegt ist (Reichweite, anonym, Kosten) — im Einzelfall bleibt alles übersteuerbar. Dort startest du auch den Turniermodus und findest den Sammel-QR des Clubs.",
      },
      {
        titel: "Zwei Regeln, die dich retten",
        text: "1. Der LETZTE Owner kann den Club weder verlassen noch sein Konto löschen — vorher jemanden zum Owner befördern. 2. Beim Löschen einer Maschine sagt die Rückfrage, was andere verlieren: freigegebene Reparaturen werden zum Tipp am Modell (oder erlöschen), maschinengebundenes Wissen wandert ans Modell. Beim Löschen des Clubs bleiben die Maschinen bei ihren Eigentümern.",
      },
    ],
  },
  {
    key: "einstieg-ki",
    titel: "Die KI, ehrlich erklärt",
    einleitung:
      "Vier Stellen nutzen ein Sprachmodell. Was davon für dich läuft, was du selbst machst — und warum das so ist.",
    schritte: [
      {
        titel: "Was die KI kann",
        text: "Handbuch-Daten aus deinem Handbuch-PDF extrahieren (nur Faktentabellen, das PDF wird nie gespeichert), einen Troubleshooting-Guide für dein Modell schreiben (mit Websuche gegen IPDB, PinWiki, Pinside), Wartungspunkte aus dem Guide ableiten — und beim Anlegen einer Reparatur einen Vorschlag für Diagnose, Maßnahme und Teile machen.",
      },
      {
        titel: "Die Regel",
        text: "Der KI-Reparaturvorschlag läuft für alle über den Schlüssel des Betreibers — ein kleiner, planbarer Aufruf. Die INHALTS-Generierung (Handbuch, Guide, Wartungspunkte) läuft in der App nur für den Betreiber: ein Handbuch-Durchlauf oder ein Guide mit Websuche kostet Euro, nicht Cent, und die Menge ist nicht planbar. Das kann sich künftig ändern — dazu müssen erst Entscheidungen zu Sponsoring oder zur Annahme von Spenden getroffen werden. Bis dahin gilt für alle der PROMPT-WEG.",
      },
      {
        titel: "Der Prompt-Weg in einem Satz",
        text: "Prompt in der App kopieren, im eigenen KI-Abo (Claude, ChatGPT, Gemini …) mit dem Handbuch-PDF bzw. eingeschalteter Websuche ausführen, NUR das JSON zurück in die App einfügen, »Prüfen« drücken, importieren. Die aufklappbare Anleitung im Import nennt geeignete Modelle; kostenlose Konten reichen meist nicht — es braucht ein starkes Modell und eine höhere Reasoning-Stufe.",
      },
      {
        titel: "Die Prüfung ist dein Freund",
        text: "Sie sagt dir nicht nur, ob das JSON gültig ist, sondern WARUM etwas fehlt — abgeschnittene Ausgabe (typisch bei Free-Konten), nur eine Tabelle kopiert, PDF nicht angehängt, Spalten abweichend — und liefert eine kopierbare NACHFRAGE, die du in denselben Chat einfügst. Meist sitzt der zweite Versuch.",
      },
      {
        titel: "Rückmeldungen machen es besser",
        text: "Eine echte Geschichte: Beim Auswerten eines Stern-SPIKE-Handbuchs schrieb das Modell dazu, dass Schalter und Lampen dort einzeln an Nodes hängen (»8-SW-17«) und es keine Matrix gibt — unsere Prüfung verlangte trotzdem Rasterpositionen. Ein Nutzer hat diese Notiz weitergegeben; seitdem kennen Prompt, Prüfung und Tipps Node-Systeme. Solche Beobachtungen aus deinen Läufen sind Gold wert — schick sie über den Käfer oben rechts als Verbesserungsvorschlag.",
      },
      {
        titel: "Gegenprüfen bleibt Pflicht",
        text: "Guides und Vorschläge sind KI-generiert. Vor sicherheitsrelevanten Arbeiten — Netzteil, Hochspannung, Fliptronic — immer mit Original-Manual und Schaltplan gegenprüfen.",
      },
    ],
  },
  {
    key: "einstieg-tiefer",
    titel: "Tiefer einsteigen — wenn du willst",
    einleitung:
      "Nichts davon brauchst du am ersten Tag. Wer mehr will, findet hier die Wegweiser in die ausführliche Anleitung.",
    schritte: [
      {
        titel: "Wissen teilen und bewerten",
        text: "Sichtbarkeiten je Eintrag, Reparaturen mit Projektion (anonym, ohne Kosten) freigeben, fremde Einträge als hilfreich oder falsch markieren oder für dich ausblenden, was Kuratoren tun: Anleitung → »Wissen teilen & Community«.",
      },
      {
        titel: "Einträge bearbeiten mit Verlauf",
        text: "Handbuch-Daten und Guides direkt korrigieren, jede Änderung als Revision, Bewertungen bleiben erhalten: Anleitung → »Wissenseinträge bearbeiten & Verlauf«.",
      },
      {
        titel: "Modelle, Familien, Generationen",
        text: "Warum Premium und LE ein Eintrag sind, die Pro aber nicht; was ein Generation-Guide für alle WPC-95-Geräte bedeutet; wie Tipps mehrere Ziele haben: Anleitung → »Wissensbasis (Modelle)« und »Troubleshooting-Guide«.",
      },
      {
        titel: "QR im Detail",
        text: "Etikett-Formate, Druck-Studio, mehrere Karten auf A4, Sammel-QR, Gast-Meldungen mit Foto: Anleitung → »Fehler erfassen«.",
      },
      {
        titel: "Für Kuratoren und Betreiber",
        text: "Moderation geteilter Einträge, Nutzer und globale Rollen, Einladungen, E-Mail-Vorlagen, KI-Prompts (Refinery), Betrieb: der Reiter »Administration« in der Hilfe (nur mit der passenden Rolle sichtbar). Wer wissen will, wie die App gebaut ist: Reiter »Techstack«.",
      },
    ],
  },
  {
    key: "einstieg-feedback",
    titel: "Probleme melden & mitgestalten",
    einleitung:
      "Die App wächst mit dem, was ihr zurückmeldet. Der Weg ist kurz.",
    schritte: [
      {
        titel: "Der Käfer oben rechts",
        text: "Auf jeder Seite sitzt in der Kopfzeile der Käfer »Problem melden / Feedback«. Er öffnet das Formular und nimmt die aktuelle Seite als Herkunft mit; App-Version und Browser gehen automatisch mit. Typ »Fehler« oder »Verbesserungsvorschlag«, Titel, Beschreibung, optional ein Screenshot — fertig.",
      },
      {
        titel: "Was danach passiert",
        text: "Der Betreiber sichtet die Meldung; unter »Meine Meldungen« siehst du den Status und eine Antwort, und beim Abschluss bekommst du eine E-Mail.",
      },
      {
        titel: "Eine gute Meldung",
        text: "Was hast du getan, was hast du erwartet, was ist passiert — und bei KI-Themen: welches Modell, welches Gerät, welcher Textausschnitt. Ein Screenshot sagt oft mehr als drei Sätze. Fehler AN EINER MASCHINE gehören dagegen als Fehler auf die Maschinen-Detailseite, nicht hierher.",
      },
    ],
  },
];
