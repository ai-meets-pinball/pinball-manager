CREATE TABLE "machine_ausstattung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" uuid NOT NULL,
	"name" text NOT NULL,
	"notiz" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "machine_ausstattung" ADD CONSTRAINT "machine_ausstattung_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- RLS ohne Policies = Deny-all für die Supabase Data-API; die App verbindet als
-- Tabellen-Owner und ist unberührt. Pflicht für JEDE neue Tabelle (vgl. 0032/0036).
ALTER TABLE "machine_ausstattung" ENABLE ROW LEVEL SECURITY;