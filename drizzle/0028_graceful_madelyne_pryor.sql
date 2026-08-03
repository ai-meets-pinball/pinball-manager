ALTER TABLE "knowledge" ADD COLUMN "verborgen_am" timestamp;--> statement-breakpoint
ALTER TABLE "knowledge" ADD COLUMN "verborgen_von" text;--> statement-breakpoint
ALTER TABLE "knowledge" ADD COLUMN "verborgen_grund" text;--> statement-breakpoint
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_verborgen_von_user_id_fk" FOREIGN KEY ("verborgen_von") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;