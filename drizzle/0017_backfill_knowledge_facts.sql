-- Backfill: machine_data -> knowledge (Phase 1). NUR befüllen, NICHTS löschen
-- (reversibel: die erzeugten knowledge-Zeilen lassen sich wieder entfernen).
--
-- Ein knowledge-Eintrag je Maschine: die Faktentabellen werden zu einem
-- inhalt-Objekt { coils: {...}, switches: {...}, ... } aggregiert. Ebene:
-- model_id, wenn die Maschine einen Gerätetyp hat (die These "Handbuch am
-- Modell"), sonst machine_id (Handeinträge ohne OPDB-Bezug). Sichtbarkeit aus
-- der bisherigen Fakten-Freigabe: platform->oeffentlich, club->club (+ club_id
-- aus share_targets), users/keine -> privat (das Doc kennt kein "bestimmte
-- Personen"). Der Check-Constraint (genau eine Ebene) hält, weil model_id und
-- machine_id einander ausschließen.

INSERT INTO "knowledge" (
  "typ", "titel", "inhalt", "source_type", "visibility",
  "model_id", "machine_id", "club_id", "created_by", "created_at", "updated_at"
)
SELECT
  'handbuch_fakten',
  m."hersteller" || ' ' || m."modell" || ' — Handbuch-Daten',
  agg."inhalt",
  'extrahiert',
  (CASE s."scope"
    WHEN 'platform' THEN 'oeffentlich'
    WHEN 'club' THEN 'club'
    ELSE 'privat'
  END)::"knowledge_visibility",
  m."model_id",
  CASE WHEN m."model_id" IS NULL THEN m."id" END,
  CASE WHEN s."scope" = 'club' THEN (
    SELECT st."club_id" FROM "share_targets" st
    WHERE st."share_id" = s."id" AND st."club_id" IS NOT NULL
    LIMIT 1
  ) END,
  m."owner_id",
  agg."created_at",
  now()
FROM "machines" m
JOIN (
  SELECT "machine_id",
         jsonb_object_agg("typ", "daten") AS "inhalt",
         min("created_at") AS "created_at"
  FROM "machine_data"
  GROUP BY "machine_id"
) agg ON agg."machine_id" = m."id"
LEFT JOIN "shares" s
  ON s."artefakt_typ" = 'machine_facts' AND s."artefakt_id" = m."id";
