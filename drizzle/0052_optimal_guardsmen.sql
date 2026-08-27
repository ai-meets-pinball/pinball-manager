CREATE TABLE "termine" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" uuid NOT NULL,
	"titel" text NOT NULL,
	"notiz" text,
	"datum" timestamp NOT NULL,
	"erinnerung_tage_vorher" integer DEFAULT 7 NOT NULL,
	"wiederholen_monate" integer,
	"erledigt_am" timestamp,
	"zuletzt_erinnert" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "termine" ADD CONSTRAINT "termine_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "termine" ADD CONSTRAINT "termine_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- RLS-Lockdown (wie ab Migration 0032): neue Tabelle, RLS an, keine Policies
-- (deny-all für die Supabase Data-API; die App verbindet als Owner).
ALTER TABLE "termine" ENABLE ROW LEVEL SECURITY;