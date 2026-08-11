CREATE TABLE "knowledge_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"knowledge_id" uuid NOT NULL,
	"generation_id" uuid,
	"model_id" uuid,
	CONSTRAINT "knowledge_targets_eindeutig" UNIQUE NULLS NOT DISTINCT("knowledge_id","generation_id","model_id"),
	CONSTRAINT "knowledge_targets_genau_ein_ziel" CHECK (num_nonnulls("knowledge_targets"."generation_id", "knowledge_targets"."model_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "knowledge" DROP CONSTRAINT "knowledge_genau_eine_ebene";--> statement-breakpoint
ALTER TABLE "knowledge_targets" ADD CONSTRAINT "knowledge_targets_knowledge_id_knowledge_id_fk" FOREIGN KEY ("knowledge_id") REFERENCES "public"."knowledge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_targets" ADD CONSTRAINT "knowledge_targets_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_targets" ADD CONSTRAINT "knowledge_targets_model_id_machine_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."machine_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_genau_eine_ebene" CHECK (case when "knowledge"."typ" = 'tipp' then num_nonnulls("knowledge"."generation_id", "knowledge"."model_id", "knowledge"."machine_id") = 0 else num_nonnulls("knowledge"."generation_id", "knowledge"."model_id", "knowledge"."machine_id") = 1 end);--> statement-breakpoint
-- RLS-Lockdown (siehe 0032): ENABLE ohne Policies = deny-all für die Supabase
-- Data-API; die App verbindet sich als Tabellen-Owner und ist nicht betroffen.
ALTER TABLE "knowledge_targets" ENABLE ROW LEVEL SECURITY;