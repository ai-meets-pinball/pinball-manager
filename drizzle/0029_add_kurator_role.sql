-- Custom SQL migration file, put your code below! --
-- Globale Rolle „Kurator": moderiert die Wissensbasis. Kann geteilte Wissens-
-- einträge (club/öffentlich) mit Begründung für alle verbergen und wieder-
-- herstellen; sieht Verborgenes weiterhin (markiert). Privates bleibt privat.
-- Vergeben durch Super-Admins.
INSERT INTO "roles" ("key", "label", "beschreibung", "scope", "rang") VALUES
  ('kurator', 'Kurator', 'Moderiert die Wissensbasis: verbirgt geteilte Wissenseinträge mit Begründung für alle und stellt sie wieder her. Privates bleibt privat.', 'global', 60)
ON CONFLICT ("key") DO NOTHING;
