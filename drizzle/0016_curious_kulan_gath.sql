CREATE TYPE "public"."knowledge_source" AS ENUM('extrahiert', 'eigen', 'community');--> statement-breakpoint
CREATE TYPE "public"."knowledge_visibility" AS ENUM('privat', 'club', 'oeffentlich');--> statement-breakpoint
CREATE TABLE "generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"hersteller" text,
	"jahr_von" integer,
	"jahr_bis" integer
);
--> statement-breakpoint
CREATE TABLE "knowledge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"typ" text NOT NULL,
	"titel" text NOT NULL,
	"inhalt" jsonb NOT NULL,
	"quelle" text,
	"source_type" "knowledge_source" NOT NULL,
	"visibility" "knowledge_visibility" DEFAULT 'privat' NOT NULL,
	"generation_id" uuid,
	"model_id" uuid,
	"machine_id" uuid,
	"club_id" uuid,
	"forked_from_id" uuid,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_genau_eine_ebene" CHECK (num_nonnulls("knowledge"."generation_id", "knowledge"."model_id", "knowledge"."machine_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_model_id_machine_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."machine_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;