CREATE TABLE "fault_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fault_id" uuid NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fault_images" ADD CONSTRAINT "fault_images_fault_id_faults_id_fk" FOREIGN KEY ("fault_id") REFERENCES "public"."faults"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- RLS-Lockdown (siehe 0032): ENABLE ohne Policies = deny-all für die Supabase
-- Data-API; die App verbindet sich als Tabellen-Owner und ist nicht betroffen.
ALTER TABLE "fault_images" ENABLE ROW LEVEL SECURITY;
