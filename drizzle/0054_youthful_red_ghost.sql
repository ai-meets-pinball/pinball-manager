ALTER TABLE "machine_models" ADD COLUMN "opdb_machine_ref" text;--> statement-breakpoint
CREATE INDEX "machine_models_opdb_machine_ref_idx" ON "machine_models" USING btree ("opdb_machine_ref");