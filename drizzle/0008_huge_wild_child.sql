CREATE TABLE "machine_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opdb_ref" text NOT NULL,
	"opdb_group_ref" text,
	"hersteller" text NOT NULL,
	"modell" text NOT NULL,
	"baujahr" integer,
	"ipdb_ref" text,
	"image_url" text,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "machine_models_opdb_ref_unique" UNIQUE("opdb_ref")
);
--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "model_id" uuid;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_model_id_machine_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."machine_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_data" ADD CONSTRAINT "machine_data_machine_typ_unique" UNIQUE("machine_id","typ");