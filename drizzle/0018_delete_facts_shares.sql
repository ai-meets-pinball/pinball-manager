-- Custom SQL migration file, put your code below! --

-- Datenmodell-Redesign Phase 1: Handbuch-Fakten sind kein Share mehr, sondern
-- Modell-Wissen in `knowledge` (bereits in 0017 backfüllt). Die alten
-- Fakten-Freigaben aus `shares` entfernen. Zugehörige `share_targets` verschwinden
-- automatisch (FK ON DELETE CASCADE). Reparatur-Freigaben bleiben unberührt.
DELETE FROM shares WHERE artefakt_typ = 'machine_facts';