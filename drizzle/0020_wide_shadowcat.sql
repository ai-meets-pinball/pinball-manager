ALTER TABLE "machine_models" ADD COLUMN "generation_id" uuid;--> statement-breakpoint
ALTER TABLE "machine_models" ADD COLUMN "generation_manuell" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "machine_models" ADD CONSTRAINT "machine_models_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_name_unique" UNIQUE("name");