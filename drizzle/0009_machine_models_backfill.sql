-- Custom SQL migration file, put your code below! --
-- Backfill: Gerätetyp-Katalog aus den vorhandenen Maschinen aufbauen.
-- Bewusst OHNE OPDB-Aufruf — die Daten stehen bereits an den Instanzen.

-- 1) Katalogeinträge je eindeutiger OPDB-Referenz. Bei mehreren Instanzen
--    derselben Referenz gewinnt die älteste (DISTINCT ON + ORDER BY created_at).
--    Als Katalogbild nur echte OPDB-Bilder übernehmen — eigene Uploads sind
--    Fotos EINES Exemplars und gehören nicht in den geteilten Katalog.
INSERT INTO "machine_models"
  ("opdb_ref", "opdb_group_ref", "hersteller", "modell", "baujahr", "ipdb_ref", "image_url")
SELECT DISTINCT ON (btrim(m."opdb_ref"))
  btrim(m."opdb_ref"),
  split_part(btrim(m."opdb_ref"), '-', 1),
  m."hersteller",
  m."modell",
  m."baujahr",
  m."ipdb_ref",
  CASE WHEN m."foto_url" LIKE 'https://img.opdb.org/%' THEN m."foto_url" END
FROM "machines" m
WHERE m."opdb_ref" IS NOT NULL
  AND btrim(m."opdb_ref") <> ''
ORDER BY btrim(m."opdb_ref"), m."created_at"
ON CONFLICT ("opdb_ref") DO NOTHING;
--> statement-breakpoint

-- 2) Instanzen mit ihrem Gerätetyp verknüpfen.
UPDATE "machines" m
SET "model_id" = mm."id"
FROM "machine_models" mm
WHERE mm."opdb_ref" = btrim(m."opdb_ref")
  AND m."model_id" IS NULL;