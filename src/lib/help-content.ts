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
      "Konto anlegen (nur mit Einladung), anmelden, Passwort zurücksetzen.",
    schritte: [
      {
        titel: "Konto anlegen — nur mit Einladung",
        text: "Eine Registrierung ist ausschließlich über einen Einladungslink möglich. Den bekommst du per E-Mail: entweder als Club-Einladung oder als allgemeine Einladung von einem Super-Admin. Über den Link gibst du Name, E-Mail und Passwort ein — mindestens 8 Zeichen mit Groß- und Kleinbuchstaben sowie einer Zahl, dazu die Wiederholung. Mit dem Augen-Symbol lässt sich das Passwort anzeigen oder verbergen.",
      },
      {
        titel: "Anmelden",
        text: "Danach mit E-Mail und Passwort anmelden. Passwort vergessen? Der Link auf der Anmeldeseite schickt dir eine E-Mail zum Zurücksetzen.",
      },
      {
        titel: "Per Einladung beitreten",
        text: "Wurdest du eingeladen, öffne den Link aus der E-Mail. Hast du noch kein Konto, registrierst du dich direkt darüber und trittst dem Club automatisch bei.",
      },
      {
        titel: "Wo finde ich was?",
        text: "Oben links liegen »Übersicht« (dein Dashboard), »Maschinen«, »Wissensbasis« (geteiltes Wissen je Modell) und »Hilfe«. Hinter dem Nutzer-Icon oben rechts findest du Clubs, Konto, Wartungspläne, Kuratierung (nur Kuratoren), Administration (nur Super-Admins) und Abmelden. Daneben schaltest du zwischen hellem und dunklem Design um.",
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
        text: "Oben stehen vier Kacheln: Anzahl deiner Maschinen, wie viele davon NICHT spielbereit sind, die offenen Fehler und die anstehenden (bzw. fälligen) Wartungen — jeweils über alle Maschinen, die du siehst (eigene plus Club-Maschinen). Ein Klick auf eine Kachel springt zum passenden Abschnitt.",
      },
      {
        titel: "Nach Bereich filtern",
        text: "Bist du in mehreren Bereichen unterwegs — deine private Sammlung plus ein oder mehrere Clubs — erscheint eine Reihe Bereichs-Chips. Du kannst MEHRERE gleichzeitig aktiv lassen; Kennzahlen und Listen zeigen dann nur diese Bereiche. Sind alle aktiv, ist kein Filter gesetzt.",
      },
      {
        titel: "Karten- oder Listenansicht",
        text: "Oben rechts schaltest du die Abschnitte zwischen Kartenansicht (luftig) und kompakter Liste (dichte Zeilen) um.",
      },
      {
        titel: "Nicht spielbereite Maschinen",
        text: "Zuerst die dringendste Lage: alle Maschinen, die nicht »Spielbereit« sind (also »Eingeschränkt« oder »Außer Betrieb«) — mit Grund und direktem Sprung zur Maschine. Mehr zum Status im Abschnitt »Maschinen-Detailseite«.",
      },
      {
        titel: "Anstehende Wartung",
        text: "Fällige und bald fällige Wartungspunkte samt Maschine. Ein Klick führt direkt in den Wartungs-Reiter der jeweiligen Maschine.",
      },
      {
        titel: "Offene Fehler",
        text: "Alle noch nicht behobenen Fehler (offen, quittiert, in Arbeit) mit Priorität — ebenfalls direkt verlinkt.",
      },
      {
        titel: "Turniermodus (Club)",
        text: "Für Turniere: Owner/Admin eines Clubs schalten oben den »Turniermodus« an. Ist er aktiv und steht an einer Club-Maschine ein NEUER, noch nicht quittierter Fehler (Status »offen«), schlägt das Dashboard sichtbar Alarm. Sobald jeder betroffene Fehler mindestens auf »quittiert« gesetzt ist, verstummt der Alarm. Im Turniermodus lädt das Dashboard automatisch nach (~25 Sekunden), damit ein neuer Fehler den Alarm auch ohne Neuladen auslöst.",
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
        text: "Maschinen → »Neue Maschine«. Wähle das Modell aus dem Katalog — Hersteller, Modell, Baujahr, Generation und Foto werden übernommen; die OPDB-Suche dient als Fallback für fehlende Modelle. Ein eigenes Foto kannst du zusätzlich hochladen. Tipp: Die Modell-Auswahl verknüpft die Maschine mit dem Modell — nur damit lassen sich später Handbuch-Daten und Reparaturen teilen.",
      },
      {
        titel: "Filter & Ansichten",
        text: "Über der Liste liegen Filter-Chips: »Alle«, »Privat« und einer je Club (mit Anzahl) — dieselben Chips wie auf der Übersicht. Rechts wechselst du zwischen Kartenansicht (mit Fotos und Badges) und Tabellenansicht (kompakt, sortierbar).",
      },
      {
        titel: "Suchen & sortieren",
        text: "Das Suchfeld filtert nach Hersteller/Modell; sortieren lässt sich nach »Neueste«, »Name« oder »Baujahr« — in beiden Ansichten.",
      },
      {
        titel: "Private Sammlung",
        text: "Ohne Club-Zuordnung gehört eine Maschine nur dir und ist auch nur für dich sichtbar.",
      },
      {
        titel: "Löschen",
        text: "Auf der Detailseite über »Löschen«. Das dürfen nur der Eigentümer, ein Club-Owner/-Admin oder ein Super-Admin.",
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
        text: "Ganz oben steht der Kopf mit Foto, Name, Betriebsstatus, den Datenbank-Kennungen (OPDB/IPDB) sowie Club und Besitzern — dazu QR-Code, Bearbeiten und Löschen; er bleibt immer sichtbar. Darunter öffnet die Detailseite mit der Übersicht: einem Status-Dashboard aus Kennzahl-Karten. Über der Übersicht liegen drei Reiter: »Übersicht«, »Betrieb« (Fehler, Wartung) und »Wissensbasis« (Reparaturen, Handbuch, Guide, Tipps). Wählst du eine Gruppe, erscheint darunter eine schmale Unterreihe für ihre Bereiche. Reiter und Kennzahl-Karten tragen Zähler (z. B. offene Fehler, fällige Wartung); die Leiste bleibt beim Scrollen sichtbar.",
      },
      {
        titel: "Betriebsstatus",
        text: "Jede Maschine trägt einen Betriebsstatus: »Spielbereit«, »Eingeschränkt« oder »Außer Betrieb«. Normalerweise wird er automatisch aus den offenen Fehlern abgeleitet — ein offener KRITISCHER Fehler setzt die Maschine auf »Eingeschränkt«. Mit Schreibrecht lässt er sich auf der Übersicht der Maschine auch von Hand setzen (nur so gibt es »Außer Betrieb«); »Zurück auf Automatik« lässt ihn wieder den Fehlern folgen. Der Status-Badge im Seitenkopf und die »Maschinenstatus«-Karte verlinken direkt auf diese Steuerung. Der Grund einer Einschränkung wird auf der Geräteseite angezeigt — bei manueller Pinnung der eingetragene Grund, bei automatischer Einschränkung der auslösende kritische Fehler (verlinkt). Dieser Status steckt hinter der »nicht spielbereit«-Kennzahl der Übersicht.",
      },
      {
        titel: "Bearbeiten",
        text: "Über »Bearbeiten« änderst du Daten, Foto, Modell- und Club-Zuordnung sowie Besitzer und Ausstattung. Ein bereits gewähltes Modell wird dabei nur angezeigt (keine erneute Suche) — über »Anderes Modell wählen« oder »Manuell anpassen« änderst du es bei Bedarf.",
      },
      {
        titel: "Besitzer",
        text: "Jede Maschine kann BESITZER tragen — die Personen, denen das Gerät tatsächlich gehört (nicht zwingend, wer es angelegt hat); auch mehrere, z. B. bei gemeinsam angeschafften Geräten. Das ist rein informativ und vergibt keine Rechte. Zur Auswahl stehen bisherige Besitzer-Namen (je Club bzw. privat — einmal angelegt, wieder wählbar), die MITGLIEDER des Clubs (ist der Besitzer schon Nutzer, wird sein Konto direkt verknüpft) oder ein neuer Name mit optionaler E-Mail. Hat ein Besitzer eine E-Mail und noch kein Konto, können Club-Owner/-Admins ihn direkt von der Detailseite in den Club einladen; nimmt er an, wird sein Konto automatisch mit dem Besitzer-Eintrag verknüpft.",
      },
      {
        titel: "Ausstattung",
        text: "Neben den Besitzern kannst du je Gerät festhalten, was zusätzlich verbaut oder dabei ist — Shaker, Topper, farbige LEDs, Ersatz-Gummisatz und dergleichen. Jeder Eintrag hat einen Namen und optional eine kurze Notiz (keine Kategorie). Gepflegt wird die Ausstattung beim Anlegen oder Bearbeiten der Maschine (im Formular, wie die Besitzer); im Kopf der Detailseite wird sie nur angezeigt. Rein informativ — vergibt keine Rechte.",
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
        text: "Auf der Maschinen-Detailseite im Reiter »Fehler« auf »Neuer Fehler«. Beschreibe das Symptom und wähle optional eine Kategorie (z. B. Spule, Schalter), eine Priorität (niedrig, mittel, hoch, kritisch) und den Status. Direkt beim Anlegen kannst du ein oder mehrere FOTOS anhängen — am Handy wahlweise mit der Kamera oder aus der Galerie; sie erscheinen später als Vorschau am Fehler. Ein offener KRITISCHER Fehler setzt die Maschine automatisch auf »Eingeschränkt« (siehe Betriebsstatus).",
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
        text: "Zu jedem Fehler kannst du mit Schreibrecht einen KI-Reparaturvorschlag erzeugen (»KI-Reparaturvorschlag« am Fehler aufklappen, Anbieter wählen, generieren). Die KI nutzt das Symptom, das Modell und das hinterlegte Wissen (Handbuch-Fakten, Troubleshooting-Guide) und schlägt Diagnose, Maßnahme und Teile vor — damit wird direkt eine neue Reparatur VORBEFÜLLT (der Fehler ist schon angehakt). Prüfe und passe alles an, bevor du speicherst: der Vorschlag ist ein Startpunkt und ersetzt nicht Manual und Schaltplan.",
      },
      {
        titel: "Per QR-Code melden — auch ohne Konto",
        text: "Jede Maschine hat ein QR-Etikett (Detailseite → »QR-Code«, drucken und ans Gerät kleben). Wer den Code scannt, landet auf einer öffentlichen Melde-Seite: Angemeldete mit Zugriff kommen direkt in den Fehler-Reiter; alle anderen — auch Gäste ganz ohne Konto — beschreiben das Symptom, geben nur ihren Namen an (erscheint als »… (Gast)«) und können ebenfalls Fotos anhängen. Priorität und Status vergibt anschließend der Betreiber. Ein Login ist der bevorzugte Weg, aber keine Voraussetzung.",
      },
      {
        titel: "QR-Code drucken — Druck-Studio",
        text: "Auf der QR-Seite steht ein Druck-Studio, das den Code MASSSTABSGETREU druckt. Zwei Kartenformen: ein EIGENES Etikett mit frei wählbaren Maßen (Breite×Höhe in mm, Hoch-/Querformat) oder eine SCORECARD in herstellerspezifischen Kartenmaßen (das passende Format wird anhand des Herstellers vorgeschlagen, ist frei änderbar). Zwei Seitenmodi: exakt in Kartengröße (für Etiketten-/Kartendrucker) oder auf A4 mit SCHNITTMARKEN zum Ausschneiden (jeder Bürodrucker). Zuschaltbar sind Name, Hinweistext und — bei Club-Maschinen — das Club-Logo (oben, links oder rechts vom Code); die Schriftgröße ist regelbar. Deine Einstellungen werden gemerkt, sodass das nächste Etikett gleich so vorbelegt ist.",
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
        text: "Auf der Maschinen-Detailseite im Reiter »Wartung«: die Maschine mit einem Standard-Wartungsplan verknüpfen (aus deinen Plänen und den Plänen deiner Clubs im Dropdown wählen — »Verknüpfen« folgt dem Standard, »Als Kopie übernehmen« macht daraus eigene Punkte), »Aus Guide übernehmen« (zieht Punkte aus dem Troubleshooting-Guide) oder »Neuer Wartungspunkt« für eigene Einträge. Erledigte Wartung trägst du je Punkt mit Datum ein — oder über »Mehrere erledigen« gleich mehrere Punkte auf einmal (Datum heute vorbelegt).",
      },
      {
        titel: "Standard-Wartungspläne",
        text: "Unter Nutzer-Icon → »Wartungspläne« legst du BELIEBIG VIELE benannte Pläne an — eigene (privat) und je Club, den du managst (Owner/Admin bearbeiten, Mitglieder nutzen sie). Beim Anlegen gibst du einen Namen an und wählst optional »aus Standard-Vorlage« (spielt eine bewährte 20-Punkte-Liste ein); danach passt du die Punkte frei an, benennst den Plan um oder löschst ihn (verknüpfte Maschinen werden dabei entkoppelt — ihre Punkte werden eigene Kopien, die Historie bleibt). Die Pläne liegen hinter Reitern.",
      },
      {
        titel: "Verknüpfen oder kopieren?",
        text: "Verknüpfst du eine Maschine mit einem Standard, folgen ihre Punkte dem Standard: Änderungen dort wirken sofort auf allen verknüpften Maschinen; solche Punkte tragen den Badge »Standard« und werden im Standard bearbeitet (Erledigt-Einträge und Historie bleiben natürlich an der Maschine). »Standard als Kopie übernehmen« legt stattdessen freie, editierbare Kopien an. Über »Verknüpfung lösen« werden alle Punkte einer verknüpften Maschine zu eigenen Kopien. Vorhandene gleichnamige Punkte behalten beim Verknüpfen ihre Historie.",
      },
      {
        titel: "Intervall & Fälligkeit",
        text: "Nur zeitbasierte Punkte (z. B. »alle 30 Tage«) bekommen einen Termin und eine Fälligkeits-Anzeige: »heute fällig«, »überfällig (seit N T.)« oder »bald fällig« für die nächsten 14 Tage. Gezählt wird tageweise — ein Punkt, der heute dran ist, gilt den ganzen Tag als fällig, nicht erst ab der Uhrzeit. Spielzahl- und Bedarf-Punkte sind reine Checkliste ohne Termin.",
      },
      {
        titel: "Erledigt eintragen",
        text: "»Erledigt eintragen« schreibt einen Eintrag in die Historie (Datum, optionale Notiz) und verschiebt die nächste Fälligkeit automatisch um das Intervall.",
      },
      {
        titel: "Historie",
        text: "Je Wartungspunkt lässt sich die Historie aller Erledigungen auf- und zuklappen; einzelne Einträge können gelöscht werden.",
      },
      {
        titel: "Erinnerungen",
        text: "Fällige Wartungen erscheinen als Badge auf der Maschinenkachel, im Wartungsplan und auf der Übersicht. Zusätzlich verschickt die App eine E-Mail-Erinnerung an den Eigentümer, sobald zeitbasierte Punkte fällig sind.",
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
        text: "Auf der Club-Seite (als Owner oder Admin) eine E-Mail eingeben, Rolle wählen und »Einladen«. Der Empfänger bekommt eine E-Mail mit Beitritts-Link. Offene Einladungen kannst du jederzeit zurückziehen.",
      },
      {
        titel: "Rollen",
        text: "Owner: volle Kontrolle — Mitglieder & Einladungen verwalten, zum Owner befördern, Club löschen. Admin: Mitglieder & Einladungen verwalten, aber nicht zum Owner befördern oder den Club löschen. Mitglied: sieht und pflegt die Club-Maschinen. Diese Rollen gelten immer für GENAU DIESEN Club — du kannst in mehreren Clubs sein und dort jeweils eine andere Rolle haben (und zusätzlich eine globale wie Kurator). Das Info-Icon neben »Mitglieder« zeigt die Erklärung jederzeit direkt im Club.",
      },
      {
        titel: "Rolle ändern",
        text: "Als Owner oder Admin wählst du in der Mitgliederliste eine andere Rolle aus und speicherst. Die Owner-Rolle kann nur ein Owner vergeben oder entziehen.",
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
        text: "Auf der Maschinenliste »Mehrere einem Club zuweisen« → Karten antippen (oder »Alle auswählen«), Ziel-Club wählen und »Zuweisen«. Praktisch, wenn Geräte vor dem Club angelegt wurden. Maschinen, die schon im gewählten Club sind, werden als »bereits zugewiesen« markiert. Umhängen darf nur, wer die Maschine auch löschen dürfte (Eigentümer, Club-Owner/-Admin); andere werden übersprungen.",
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
        text: "Auf der Maschinen-Detailseite im Reiter »Handbuch« öffnest du »Handbuch per KI auswerten«. Standardweg ist »In der App«: bestätigen, dass du das Handbuch besitzt bzw. die Rechte hast, das PDF wählen und auswerten. Anbieter, Detailstufe und Sichtbarkeit liegen unter »Erweiterte Optionen« — für den Normalfall musst du sie nicht anfassen.",
      },
      {
        titel: "Was passiert",
        text: "Claude liest das PDF und extrahiert ausschließlich Faktentabellen (Spulen, Schalter-/Lampen-Matrix, Sicherungen, Teile, Regeln, Schrauben, Gummiteile, Elektronik-Bauteile). Das PDF wird dabei NIE gespeichert — nur die Fakten landen in der Datenbank, als Wissenseintrag am Modell.",
      },
      {
        titel: "Alternative ohne KI: JSON-Import",
        text: "Hast du ein ChatGPT- oder Claude-Abo, geht es auch ohne KI-Verarbeitung in der App: In »Handbuch per KI auswerten« auf »Eigenes ChatGPT-/Claude-Abo« umschalten, den vorbereiteten Prompt kopieren, dort zusammen mit dem Handbuch nutzen und die JSON-Ausgabe einfügen. »Prüfen« zeigt eine Vorschau samt Warnungen, erst dann wird importiert.",
      },
      {
        titel: "KI-Schlüssel (falls nötig)",
        text: "Die KI-Funktionen (Handbuch auswerten, Troubleshooting-Guide, Wartungspunkte aus dem Guide) laufen über Claude (Anthropic). Ist zentral kein Schlüssel hinterlegt, erscheint (unter »Erweiterte Optionen«) ein Feld für deinen eigenen Anthropic-API-Schlüssel: Er wird nur für die jeweilige Aktion genutzt und NICHT gespeichert. Einen Schlüssel legst du unter console.anthropic.com an; lade dort etwas Guthaben auf und setze ein monatliches Ausgabenlimit, damit keine unerwarteten Kosten entstehen. Selbst gehostete Installationen können die KI-Funktionen alternativ über ein lokales Modell (Ollama oder MLX) betreiben.",
      },
      {
        titel: "Ansehen",
        text: "Switch- und Lampen-Matrix erscheinen als farbcodiertes Raster (WPC-Draht-Farbcodes, Opto-Schalter markiert). Über die Kennzahl-Karten springst du zu den Abschnitten; Tabellen mit einer Typ-Spalte lassen sich filtern.",
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
        text: "Der Guide-Reiter auf der Maschinen-Detailseite ist mit Schreibrecht immer sichtbar. Wer nur lesen darf, sieht ihn, sobald Handbuch-Daten oder Guides vorliegen.",
      },
      {
        titel: "Erstellen",
        text: "Im Reiter »Guide« auf »Troubleshooting-Guide erstellen« (nur mit Schreibrecht). Claude bestimmt zunächst die Plattform bzw. Geräte-Generation und prüft sie samt bekannter Serienfehler per Websuche gegen Community-Quellen (IPDB, PinWiki, Pinside). Das dauert ein bis zwei Minuten.",
      },
      {
        titel: "Alternative ohne KI: JSON-Import",
        text: "Wie bei den Handbuch-Daten geht es auch ohne die KI-Erstellung in der App: Im Reiter »Guide« den vorbereiteten Prompt kopieren (er enthält bereits Hersteller, Modell und Baujahr), in ChatGPT ausführen und die JSON-Ausgabe einfügen. »Prüfen« zeigt eine Vorschau samt Warnungen, erst dann wird importiert. Der Import ersetzt deinen bisherigen Guide auf der gewählten Ebene — der alte Stand wandert in den Verlauf. Importierte Guides sind als »Importiert (extern erstellt)« gekennzeichnet.",
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
        text: "Über »Guide neu erstellen« lässt sich der Leitfaden jederzeit neu erzeugen. Der bisherige Stand geht dabei nicht verloren — er wandert in den Verlauf des Eintrags (siehe »Wissenseinträge bearbeiten & Verlauf«).",
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
        text: "»Wissensbasis« in der Navigation zeigt alle Modelle, zu denen für dich Wissen sichtbar ist (eigenes plus geteiltes) — mit Foto und Anzahl der Einträge.",
      },
      {
        titel: "Modellseite",
        text: "Die Modellseite bündelt alles zu einem Modell in Reitern: Handbuch-Daten, Troubleshooting-Guide, Tipps und geteilte Reparaturen — jeweils mit Anzahl. Eigene Einträge lassen sich hier genauso verwalten wie auf der Maschinen-Detailseite.",
      },
      {
        titel: "Drei Ebenen",
        text: "Wissen hängt an einer von drei Ebenen: an der Geräte-Generation (gilt für alle Modelle der Generation), am Modell (Normalfall, edition-genau) oder an einer einzelnen Maschine (nur wenn sie kein Modell hat). Handbuch-Fakten bleiben bewusst modell-genau, weil sich Editionen (Pro/Premium) unterscheiden.",
      },
      {
        titel: "Allgemeine Tipps",
        text: "Im Reiter »Tipps« (Maschine wie Modellseite) sammelst du frei formulierte Hinweise — z. B. Wartungskniffe oder bekannte Schwachstellen. Der Text erlaubt eine einfache FORMATIERUNG: **fett**, _kursiv_, Aufzählungen mit einem Bindestrich am Zeilenanfang und Links als [Text](URL) — reine URLs werden automatisch anklickbar. Zusätzlich lassen sich weiterführende LINKS mit optionalem Namen und kurzer Beschreibung anhängen. Ein Tipp kann anders als übriges Wissen MEHRERE Modelle und/oder ganze Generationen zugleich betreffen; die Ziele wählst du beim Anlegen aus dem Katalog (das Modell der aktuellen Maschine ist vorausgewählt). Die Tipp-Liste lässt sich zwischen Karten- und kompakter Listenansicht umschalten. Jeder Tipp zeigt »gilt für …«, trägt eine Sichtbarkeit und lässt sich wie andere Einträge bewerten, ausblenden, bearbeiten und (nur vom Autor) löschen.",
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
        text: "Handbuch-Daten und Guides tragen eine Sichtbarkeit: »privat« (nur du), »Club« oder »öffentlich« (alle angemeldeten Nutzer — kein Zugriff aus dem offenen Internet). Du wählst sie beim Erzeugen bzw. Import und kannst sie am Eintrag jederzeit ändern. Jeder Eintrag zeigt seinen Autor.",
      },
      {
        titel: "Reparaturen teilen",
        text: "Unter jeder Reparatur gibt es »Teilen«. Standardmäßig anonym und ohne Kosten/Aufwand — beides lässt sich je Eintrag umschalten. Reichweiten: alle angemeldeten Nutzer, bestimmte Clubs oder bestimmte Personen per E-Mail. Die Vorschau zeigt exakt, was andere lesen.",
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
        text: "Unter jedem eigenen Eintrag gibt es »Bearbeiten«: bei Handbuch-Daten und Guides änderst du Titel und Inhalt als JSON (gleiche Struktur wie beim Import), »Prüfen« validiert die Eingabe, erst dann ist Speichern möglich. Tipps bearbeitest du direkt als Text samt ihrer Links. Optional gibst du einen Kommentar zur Änderung an.",
      },
      {
        titel: "Verlauf",
        text: "»Verlauf (n)« unter dem Eintrag zeigt alle früheren Stände — mit Datum, Bearbeiter, Kommentar und dem kompletten alten Inhalt. Den Verlauf sieht nur der Autor.",
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
        text: "Im Abschnitt »Profil« pflegst du Name, Vorname/Nachname, optionale Initialen und ein Profilbild. Das Bild (oder deine Initialen) erscheint als Avatar in der Navigation.",
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
        text: "Unter »Meine Clubs« siehst du deine Clubs samt Rolle und kannst sie über »Verlassen« verlassen. Bist du letzter Owner, musst du vorher jemanden zum Owner befördern — dann steht dort statt des Buttons ein Hinweis.",
      },
      {
        titel: "WhatsApp bei neuen Fehlern",
        text: "Unter »WhatsApp-Benachrichtigung« hinterlegst du deine Nummer (Format +49151…) und aktivierst die Benachrichtigung PRO CLUB. Danach bekommst du eine WhatsApp, sobald an einer Maschine dieses Clubs ein neuer Fehler gemeldet wird — auch bei Gast-Meldungen per QR-Code. Nur Owner/Admins eines Clubs können das aktivieren; ohne hinterlegte Nummer geht trotz aktivem Schalter nichts raus.",
      },
      {
        titel: "Passwort ändern",
        text: "Unter »Sicherheit« den Bereich »Passwort ändern« aufklappen: aktuelles Passwort, neues Passwort und Wiederholung — gleiche Regeln, mit Anzeigen/Verbergen.",
      },
      {
        titel: "Freigabe-Voreinstellungen",
        text: "Hier legst du fest, was beim Teilen von Handbuch-Daten und Reparaturen vorbelegt wird (Reichweite, anonym, Kosten) und ob automatisch freigegeben wird. Details siehe Abschnitt »Wissen teilen & Community«.",
      },
      {
        titel: "Passwort vergessen",
        text: "Auf der Anmeldeseite »Passwort vergessen?« → du erhältst eine E-Mail mit einem Reset-Link.",
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
        text: "Nutzer-Icon oben rechts → »Problem melden«. Die Seite hat Reiter: »Neue Meldung« (Typ Fehler oder Verbesserungsvorschlag, Titel, Beschreibung, optional Screenshot), »Meine Meldungen« und — für Super-Admins — »Alle Meldungen«. Seite, App-Version und Browser werden automatisch mitgeschickt; du musst nichts davon heraussuchen.",
      },
      {
        titel: "Was passiert dann?",
        text: "Die Betreiber werden benachrichtigt und sichten die Meldung. Unter »Meine Meldungen« siehst du jederzeit den Status (offen → in Arbeit → erledigt, oder zurückgestellt bzw. verworfen) und eine eventuelle Antwort. Sobald deine Meldung abgeschlossen wird (erledigt/zurückgestellt/verworfen), bekommst du zusätzlich eine E-Mail mit dem Ergebnis.",
      },
      {
        titel: "Gut zu wissen",
        text: "Fehler AN EINER MASCHINE (z. B. »linker Flipper prellt«) gehören nicht hierher, sondern als Fehler auf die Maschinen-Detailseite — dieses Formular ist für die App selbst.",
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
        titel: "Handbuch als PDF",
        text: "Diese Anleitung gibt es oben rechts auch als PDF zum Herunterladen — praktisch zum Weitergeben oder für die Werkstatt ohne Netz.",
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
        text: "Super-Admins finden »Administration« im Nutzer-Menü oben rechts. Weitere Super-Admins lassen sich dort ernennen; der letzte Super-Admin bleibt geschützt und kann nicht entfernt werden.",
      },
      {
        titel: "Rollen je Nutzer verwalten",
        text: "Es gibt zwei Achsen: GLOBALE Rollen (Super-Admin, Kurator — plattformweit) und CLUB-Rollen (Owner/Admin/Mitglied — immer in genau einem Club). Eine Person kann mehrere halten: verschiedene Rollen in verschiedenen Clubs plus globale. In der Nutzerliste zeigt jede Person ihre Rollen; unter »Rollen verwalten« vergibst/änderst/entziehst du beides — bei einer Club-Rolle wählst du immer den Club dazu. (Club-Rollen lassen sich weiterhin auch direkt im jeweiligen Club vergeben.)",
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
        text: "»Sichtbarkeit« neben einem Nutzer zeigt, welche Maschinen dieser Nutzer aktuell sehen kann — hilfreich, wenn jemand etwas vermisst. (Ein temporäres Werkzeug.)",
      },
    ],
  },
  {
    key: "plattform-einladungen",
    titel: "Nutzer einladen",
    nurSuperAdmin: true,
    einleitung:
      "Die Registrierung ist nur mit Einladung möglich — neue Personen lädst du hier ein.",
    schritte: [
      {
        titel: "Einladen",
        text: "Unter »Nutzer einladen« die E-Mail eingeben — die Person erhält einen Registrierungslink. Optional kannst du eine persönliche Nachricht mitschicken. Diese Einladung ordnet keinem Club zu; dafür lädst du zusätzlich im jeweiligen Club ein.",
      },
      {
        titel: "Offene Einladungen",
        text: "Offene Einladungen stehen darunter und lassen sich jederzeit zurückziehen. Einladungen verfallen automatisch nach 7 Tagen.",
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
        text: "Unter »Generationen« pflegst du die Board-System-Liste (z. B. WPC-95, Stern SPIKE 2) mit Hersteller und Zeitraum. Jede Generation zeigt aufklappbar ihre Modelle. Wissen auf Generation-Ebene (z. B. ein Guide) erscheint automatisch bei allen Modellen der Generation.",
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
        text: "Je Meldung lassen sich Status (offen → in Arbeit → erledigt, zusätzlich zurückgestellt und verworfen) und eine Antwort setzen — beides sieht der Melder unter »Meine Meldungen«. Wird eine Meldung ABGESCHLOSSEN (erledigt/zurückgestellt/verworfen), bekommt der Melder automatisch eine E-Mail mit dem Ergebnis. Die Liste »Alle Meldungen« lässt sich nach Status filtern (Chips). Bei einer neuen Meldung geht automatisch eine E-Mail an alle Super-Admins; erledigte oder gegenstandslose Meldungen können gelöscht werden.",
      },
      {
        titel: "Versand-Protokoll",
        text: "Unter jeder Meldung stehen die dazu verschickten Mails (wann, an wen, welcher Text). Das komplette Protokoll ALLER System-Mails (Einladungen, Passwort-Reset, Wartungs-Erinnerungen, Feedback-Benachrichtigungen) findest du unter Administration → »Mail-Protokoll«, nach Kategorie filterbar. Unter Administration → »WhatsApp« liegt entsprechend das Protokoll der WhatsApp-Fehler-Benachrichtigungen; oben steht, ob der echte Versand aktiv ist oder nur mitprotokolliert wird.",
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
        text: "Administration → »Prompts«. Editierbar sind die Prompts für den Troubleshooting-Guide, die Handbuch-Extraktion, die Wartungspunkte-aus-Guide und den Reparaturvorschlag. Der Standard liegt im Code; hier speicherst du nur Abweichungen. Strukturelle Teile (die JSON-Ausgabeform, die Fakten-Spalten) bleiben bewusst fest, damit ein Edit das Auswerten der Antwort nie brechen kann.",
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
