# Onboarding-E-Mail für Friendly User

Vorlage für die persönliche Einladung der ersten Tester:innen — zum
Kopieren in den Mailer. Platzhalter in `{{…}}` vor dem Versand füllen; die
Einladung selbst (Link) verschickt die App, diese Mail kommt dazu (davor
oder gleichzeitig). Du-Form, weil es Freunde und Vereinskolleg:innen sind.

---

**Betreff:** Pinball Manager — du bist eingeladen (Friendly-User-Runde)

Hallo {{Vorname}},

ich baue seit ein paar Monaten am **Pinball Manager** — einer Betriebs- und
Wissensdatenbank für Flipper: Welche Maschine hat welchen Fehler, was wurde
wann repariert, was ist zur Wartung fällig — und dazu Wissen je Modell
(Handbuch-Daten, Troubleshooting-Guide, Tipps), das man teilen kann. Jetzt
ist der Punkt, an dem ich echte Nutzer:innen brauche, keine Testdaten. Du
bist eine:r von rund {{Anzahl}} Friendly Usern.

**So kommst du rein**

Es gibt keine offene Registrierung — du bekommst (oder hast schon) eine
E-Mail mit einem Einladungslink von der App. Darüber legst du Name und
Passwort an, fertig. Die App läuft unter
https://pinball-manager.silverballmania.com und ist fürs Handy gemacht:
Reparaturen passieren am Gerät.

**Die ersten zehn Minuten**

1. Maschinen → »Neue Maschine«, Modell aus dem Katalog wählen.
2. Auf der Detailseite unter »Betrieb« den ersten Fehler eintragen — oder
   gleich das QR-Etikett drucken und ans Gerät kleben: Wer es scannt, meldet
   einen Fehler mit Foto, ganz ohne Konto.
3. Wenn etwas repariert ist: Reparatur erfassen, Fehler abhaken.

Alles Weitere — Wartungsplan (es gibt eine umfassende Standardvorlage zum
Kopieren und Kürzen), Dokumente, Handbuch-Daten, Clubs — kommt, wenn du es
brauchst. Der kurze Weg hinein steht in der Hilfe unter **Einstieg**, mit
einem eigenen Pfad je nachdem, wie du Flipper betreibst:

- Solo-Sammler:in: https://pinball-manager.silverballmania.com/help/einstieg
- Club-Mitglied: https://pinball-manager.silverballmania.com/help/einstieg?ich=mitglied
- Club-Owner / -Admin: https://pinball-manager.silverballmania.com/help/einstieg?ich=owner

Das Ganze gibt es dort auch als PDF-Handbuch.

**Ehrlich zur KI**

Vier Stellen nutzen ein Sprachmodell. Der KI-Reparaturvorschlag läuft für
alle über meinen Schlüssel (kleiner Aufruf, mit Limit). Handbuch-Daten und
Guides erzeugst du dagegen über den **Prompt-Weg**: Prompt in der App
kopieren, im eigenen KI-Abo (Claude, ChatGPT, Gemini …) mit dem Handbuch-PDF
ausführen, das JSON zurück in die App einfügen — die Prüfung sagt dir, ob
das Ergebnis gut genug ist, und gibt dir eine Nachfrage für den Chat mit.
Warum so: Ein Handbuch-Durchlauf kostet Euro, nicht Cent, und die Menge ist
nicht planbar. Das kann sich ändern, wenn Sponsoring oder Spenden geklärt
sind. Kostenlose KI-Konten reichen dafür meist nicht — es braucht ein
starkes Modell.

**Was ich von dir brauche**

Benutz die App mit deinen echten Geräten — und sag mir, was hakt. Oben
rechts sitzt auf jeder Seite ein Käfer-Knopf »Problem melden / Feedback«;
er nimmt die Seite, App-Version und Browser automatisch mit. Am wertvollsten
sind konkrete Beobachtungen: Was hast du getan, was hast du erwartet, was
ist passiert? Besonders beim Prompt-Weg — ein Beispiel: Ein Tester merkte
an, dass Stern-SPIKE-Handbücher gar keine Schalter-Matrix haben und die
Prüfung trotzdem danach fragte. Diese eine Notiz hat Prompt und Prüfung
verbessert. Genau solche Rückmeldungen.

**Was du wissen solltest**

- Das ist eine Friendly-User-Runde: Es wird sich noch einiges ändern, und
  Fehler sind eingeplant. Deine Daten bleiben erhalten; ich sage vorher
  Bescheid, falls je etwas zurückgesetzt werden müsste.
- Deine Maschinen sind privat, solange du sie keinem Club zuordnest oder
  Wissen freigibst. Wer hochlädt, ist für die Rechte am Inhalt verantwortlich
  — die App weist an jeder Upload-Stelle darauf hin.
- Fragen jederzeit an {{deine E-Mail}}; oder einfach über den Käfer.

Danke, dass du mitmachst — und viel Spaß beim Ausprobieren.

{{Dein Name}}

---

*Kurzfassung für WhatsApp/Chat:*

> Hi {{Vorname}}, ich hab dich beim Pinball Manager als Friendly User
> eingeladen — Einladungslink kommt per Mail. Betriebs- und Wissensdatenbank
> für Flipper: Fehler, Reparaturen, Wartung, Wissen je Modell. Erste Schritte:
> https://pinball-manager.silverballmania.com/help/einstieg — Feedback über den
> Käfer oben rechts. Danke fürs Mitmachen!
