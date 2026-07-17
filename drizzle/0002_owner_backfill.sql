-- Custom SQL migration file, put your code below! --
-- Backfill: Der Ersteller jedes Clubs (clubs.created_by) wird Owner.
-- Läuft als EIGENE Migration/Transaktion, weil der Enum-Wert 'owner' (in 0001
-- hinzugefügt) erst nach Commit dieser Transaktion verwendet werden darf.
UPDATE "memberships" m
SET "rolle" = 'owner'
FROM "clubs" c
WHERE m."club_id" = c."id"
  AND m."user_id" = c."created_by"
  AND m."rolle" <> 'owner';
