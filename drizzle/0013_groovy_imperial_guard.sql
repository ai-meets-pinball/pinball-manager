CREATE TABLE "troubleshooting_guides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" uuid NOT NULL,
	"daten" jsonb NOT NULL,
	"model" text NOT NULL,
	"erstellt_von" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "troubleshooting_guides_machine_id_unique" UNIQUE("machine_id")
);
--> statement-breakpoint
ALTER TABLE "troubleshooting_guides" ADD CONSTRAINT "troubleshooting_guides_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "troubleshooting_guides" ADD CONSTRAINT "troubleshooting_guides_erstellt_von_user_id_fk" FOREIGN KEY ("erstellt_von") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;