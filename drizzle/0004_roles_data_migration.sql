-- Custom SQL migration file, put your code below! --
-- Datenmigration auf das einheitliche Rollenmodell (roles + role_assignments).
-- Läuft zwischen 0003 (Tabellen anlegen) und 0005 (alte Spalten/Tabellen entfernen).

-- 1) Rollen-Katalog befüllen (Daten statt Enum).
INSERT INTO "roles" ("key", "label", "beschreibung", "scope", "rang") VALUES
  ('superadmin', 'Super-Admin', 'Darf alles administrieren (global).', 'global', 100),
  ('owner',      'Owner',       'Volle Kontrolle über den Club; vergibt Owner-Rechte, löscht den Club.', 'club', 30),
  ('admin',      'Admin',       'Verwaltet Mitglieder und Einladungen des Clubs.', 'club', 20),
  ('member',     'Mitglied',    'Sieht und pflegt die Maschinen des Clubs.', 'club', 10)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

-- 2) Mitgliedschaften → club-bezogene Rollenzuweisungen.
INSERT INTO "role_assignments" ("user_id", "role_id", "club_id", "created_at")
SELECT m."user_id", r."id", m."club_id", m."created_at"
FROM "memberships" m
JOIN "roles" r ON r."key" = m."rolle"::text AND r."scope" = 'club'
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- 3) Globale Rolle (user.role) → globale Rollenzuweisung (club_id = NULL).
INSERT INTO "role_assignments" ("user_id", "role_id", "club_id")
SELECT u."id", r."id", NULL
FROM "user" u
JOIN "roles" r ON r."key" = 'superadmin'
WHERE u."role" = 'superadmin'
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- 4) Einladungen: Enum-Rolle → Katalog-FK.
UPDATE "invitations" i
SET "role_id" = r."id"
FROM "roles" r
WHERE r."key" = i."rolle"::text
  AND r."scope" = 'club'
  AND i."role_id" IS NULL;