-- Custom SQL migration file, put your code below! --
-- Globale Rolle „Supporter": nur-lesender Einblick in Club-Daten (keine privaten
-- Sammlungen), keine Mutationen, keine Rollenvergabe. Vergeben durch Super-Admins.
INSERT INTO "roles" ("key", "label", "beschreibung", "scope", "rang") VALUES
  ('supporter', 'Supporter', 'Nur-lesender Einblick in alle Clubs und deren Maschinen (ohne private Sammlungen). Kann nichts ändern.', 'global', 50)
ON CONFLICT ("key") DO NOTHING;
