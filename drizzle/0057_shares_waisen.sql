-- Verwaiste Reparatur-Freigaben aufräumen. `shares.artefakt_id` ist polymorph
-- (machine_facts | repair) und trägt deshalb keinen FK: wurde eine geteilte
-- Reparatur oder ihre ganze Maschine gelöscht, blieb die Freigabe als Waise
-- stehen — unsichtbar (die Abfragen joinen auf repairs), aber vorhanden.
-- Seit Version 1.57 räumen deleteMachine/deleteMachines/deleteRepair die
-- Freigaben in derselben Transaktion ab; das hier holt den Altbestand nach.
DELETE FROM "shares"
WHERE "artefakt_typ" = 'repair'
  AND NOT EXISTS (SELECT 1 FROM "repairs" WHERE "repairs"."id" = "shares"."artefakt_id");
