-- Custom SQL migration file, put your code below! --
-- Rollen-Katalog aufräumen.
--
-- (1) Supporter entfernen: die globale Nur-Lese-Rolle wird nicht mehr gebraucht.
--     Zuerst ihre Zuweisungen löschen (role_assignments.role_id → roles.id ohne
--     ON DELETE), dann die Katalog-Zeile. Betroffene Konten verlieren nur die
--     globale Supporter-Rolle; ihre Club-Rollen bleiben unberührt.
DELETE FROM "role_assignments" WHERE "role_id" = (SELECT "id" FROM "roles" WHERE "key" = 'supporter');
--> statement-breakpoint
DELETE FROM "roles" WHERE "key" = 'supporter';
--> statement-breakpoint
-- (2) Zwei bislang nur implizite Personas als Katalog-Doku ergänzen. Sie sind
--     NICHT zuweisbar (kein Pfad im Code weist 'gast'/'user' je zu) — sie machen
--     im Rollen-Katalog nur sichtbar, was es ohnehin schon gibt. scope 'basis'
--     dient allein der Anzeige/Sortierung (kein Code prüft scope).
INSERT INTO "roles" ("key", "label", "beschreibung", "scope", "rang") VALUES
  ('gast', 'Gast', 'Kein Konto. Kann per QR-Code an einer Maschine einen Fehler melden (der Aufkleber ist das Melde-Recht). Wird nicht angemeldet und hält keine Rechte.', 'basis', 1),
  ('user', 'User', 'Angemeldetes Konto ohne Club-Rolle. Besitzt und pflegt eigene (private) Maschinen; sieht keine fremden Club-Maschinen. Grundstufe jedes Kontos.', 'basis', 2)
ON CONFLICT ("key") DO NOTHING;
