CREATE TYPE "public"."feedback_status" AS ENUM('offen', 'in Arbeit', 'erledigt');--> statement-breakpoint
CREATE TYPE "public"."feedback_typ" AS ENUM('fehler', 'verbesserung');--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"typ" "feedback_typ" DEFAULT 'fehler' NOT NULL,
	"titel" text NOT NULL,
	"beschreibung" text NOT NULL,
	"seite" text,
	"app_version" text,
	"user_agent" text,
	"screenshot_url" text,
	"status" "feedback_status" DEFAULT 'offen' NOT NULL,
	"antwort" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;