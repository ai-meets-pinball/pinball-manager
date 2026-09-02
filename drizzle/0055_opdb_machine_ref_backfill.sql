-- Familienschlüssel nachziehen: erste zwei Segmente der OPDB-Referenz
-- ("GV8wB-MRjKd-ARz2r" → "GV8wB-MRjKd"). Dieselbe Regel wie lib/opdb-ref.ts:
-- ein leeres zweites Segment (einsegmentig, doppelter Bindestrich) ergibt NULL.
UPDATE "machine_models"
SET "opdb_machine_ref" = CASE
  WHEN split_part(btrim("opdb_ref"), '-', 2) <> ''
  THEN split_part(btrim("opdb_ref"), '-', 1) || '-' || split_part(btrim("opdb_ref"), '-', 2)
END;
--> statement-breakpoint
-- Altlast der früheren Normalisierung: ensureMachineModel kürzte eine gewählte
-- Editions-Referenz (3 Segmente) auf 2 und hängte die Maschine an die
-- Familienzeile, obwohl es zu ihrer eigenen Referenz eine Katalogzeile gibt.
-- Jetzt zeigt jede Maschine auf ihre eigene Edition — NUR innerhalb derselben
-- Familie (Schutz: gleicher Schlüssel), damit keine Maschine die Familie wechselt.
UPDATE "machines" m
SET "model_id" = neu."id"
FROM "machine_models" neu, "machine_models" alt
WHERE neu."opdb_ref" = btrim(m."opdb_ref")
  AND alt."id" = m."model_id"
  AND neu."id" <> alt."id"
  AND neu."opdb_machine_ref" IS NOT NULL
  AND neu."opdb_machine_ref" = alt."opdb_machine_ref";
