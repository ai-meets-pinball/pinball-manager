CREATE TABLE "whatsapp_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empfaenger" text NOT NULL,
	"anlass" text NOT NULL,
	"inhalt" text,
	"fault_id" uuid,
	"erfolg" boolean DEFAULT true NOT NULL,
	"fehler" text,
	"gesendet_am" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_optin" (
	"user_id" text NOT NULL,
	"club_id" uuid NOT NULL,
	"aktiv" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_optin_user_id_club_id_pk" PRIMARY KEY("user_id","club_id")
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "whatsapp_nummer" text;--> statement-breakpoint
ALTER TABLE "whatsapp_log" ADD CONSTRAINT "whatsapp_log_fault_id_faults_id_fk" FOREIGN KEY ("fault_id") REFERENCES "public"."faults"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_optin" ADD CONSTRAINT "whatsapp_optin_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_optin" ADD CONSTRAINT "whatsapp_optin_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- RLS-Lockdown (wie ab Migration 0032): JEDE neue Tabelle sperrt die Supabase
-- Data-API per aktiviertem RLS OHNE Policies (deny-all für /rest/v1/). Die App
-- verbindet als Tabellen-Owner und ist davon unberührt.
ALTER TABLE "whatsapp_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "whatsapp_optin" ENABLE ROW LEVEL SECURITY;