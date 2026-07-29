CREATE TABLE "repair_faults" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repair_id" uuid NOT NULL,
	"fault_id" uuid NOT NULL,
	CONSTRAINT "repair_faults_unique" UNIQUE("repair_id","fault_id")
);
--> statement-breakpoint
ALTER TABLE "repair_faults" ADD CONSTRAINT "repair_faults_repair_id_repairs_id_fk" FOREIGN KEY ("repair_id") REFERENCES "public"."repairs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_faults" ADD CONSTRAINT "repair_faults_fault_id_faults_id_fk" FOREIGN KEY ("fault_id") REFERENCES "public"."faults"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Backfill: bestehende Einzel-Verknüpfung repairs.fault_id → repair_faults.
INSERT INTO "repair_faults" ("repair_id", "fault_id")
SELECT id, fault_id FROM "repairs" WHERE fault_id IS NOT NULL
ON CONFLICT ("repair_id", "fault_id") DO NOTHING;
