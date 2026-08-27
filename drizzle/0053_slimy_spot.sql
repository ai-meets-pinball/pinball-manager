CREATE TABLE "machine_dokumente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" uuid NOT NULL,
	"typ" text NOT NULL,
	"titel" text NOT NULL,
	"notiz" text,
	"url" text,
	"dateiname" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "machine_dokumente" ADD CONSTRAINT "machine_dokumente_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_dokumente" ADD CONSTRAINT "machine_dokumente_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- RLS-Lockdown (wie ab Migration 0032): neue Tabelle, RLS an, keine Policies
-- (deny-all für die Supabase Data-API; die App verbindet als Owner).
ALTER TABLE "machine_dokumente" ENABLE ROW LEVEL SECURITY;