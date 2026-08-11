CREATE TABLE "machine_besitzer_zuordnung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" uuid NOT NULL,
	"besitzer_id" uuid NOT NULL,
	CONSTRAINT "machine_besitzer_zuordnung_unique" UNIQUE("machine_id","besitzer_id")
);
--> statement-breakpoint
ALTER TABLE "machines" DROP CONSTRAINT "machines_besitzer_id_machine_besitzer_id_fk";
--> statement-breakpoint
ALTER TABLE "machine_besitzer_zuordnung" ADD CONSTRAINT "machine_besitzer_zuordnung_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_besitzer_zuordnung" ADD CONSTRAINT "machine_besitzer_zuordnung_besitzer_id_machine_besitzer_id_fk" FOREIGN KEY ("besitzer_id") REFERENCES "public"."machine_besitzer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Bestehende 1:1-Zuordnungen (0035) in die n:m-Tabelle übernehmen, BEVOR die
-- Spalte fällt — kein stiller Datenverlust bei bereits gesetzten Besitzern.
INSERT INTO "machine_besitzer_zuordnung" ("machine_id", "besitzer_id")
  SELECT "id", "besitzer_id" FROM "machines" WHERE "besitzer_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "machines" DROP COLUMN "besitzer_id";--> statement-breakpoint
-- RLS-Lockdown (siehe 0032): ENABLE ohne Policies = deny-all für die Supabase
-- Data-API; die App verbindet sich als Tabellen-Owner und ist nicht betroffen.
ALTER TABLE "machine_besitzer_zuordnung" ENABLE ROW LEVEL SECURITY;