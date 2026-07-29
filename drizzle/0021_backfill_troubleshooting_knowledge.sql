-- Custom SQL migration file, put your code below! --

-- Datenmodell-Redesign Phase 2: Troubleshooting-Guides werden Modell-Wissen.
-- Jede Zeile aus troubleshooting_guides wird ein knowledge-Eintrag
-- (typ='troubleshooting'). inhalt = Umschlag { guide, websuche, model }; Ebene =
-- Modell, wenn die Maschine einen Gerätetyp hat, sonst Maschine. created_by =
-- Ersteller (sonst Eigentümer). Sichtbarkeit privat (heutiges Verhalten). Nur
-- populate — troubleshooting_guides bleibt vorerst bestehen (Drop separat).
INSERT INTO knowledge
  (typ, titel, inhalt, source_type, visibility,
   model_id, machine_id, created_by, created_at, updated_at)
SELECT
  'troubleshooting',
  m.hersteller || ' ' || m.modell || ' — Troubleshooting-Guide',
  jsonb_build_object('guide', tg.daten, 'websuche', tg.websuche, 'model', tg.model),
  'eigen',
  'privat',
  m.model_id,
  CASE WHEN m.model_id IS NULL THEN tg.machine_id END,
  COALESCE(tg.erstellt_von, m.owner_id),
  tg.created_at,
  tg.created_at
FROM troubleshooting_guides tg
JOIN machines m ON m.id = tg.machine_id;