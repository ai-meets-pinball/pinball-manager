CREATE TYPE "public"."maintenance_intervall_typ" AS ENUM('zeit', 'spiele', 'bedarf');--> statement-breakpoint
CREATE TYPE "public"."maintenance_prioritaet" AS ENUM('niedrig', 'mittel', 'hoch', 'sehr hoch', 'kritisch');--> statement-breakpoint
CREATE TABLE "maintenance_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"machine_id" uuid NOT NULL,
	"datum" timestamp DEFAULT now() NOT NULL,
	"erledigt_von" text,
	"notiz" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" uuid NOT NULL,
	"titel" text NOT NULL,
	"kategorie" text,
	"bauteil" text,
	"taetigkeit" text,
	"beschreibung" text,
	"prioritaet" "maintenance_prioritaet" DEFAULT 'mittel' NOT NULL,
	"intervall_typ" "maintenance_intervall_typ" DEFAULT 'bedarf' NOT NULL,
	"intervall_tage" integer,
	"intervall_text" text,
	"aktiv" boolean DEFAULT true NOT NULL,
	"zuletzt_erledigt" timestamp,
	"naechste_faelligkeit" timestamp,
	"zuletzt_erinnert" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "maintenance_log" ADD CONSTRAINT "maintenance_log_task_id_maintenance_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."maintenance_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_log" ADD CONSTRAINT "maintenance_log_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_log" ADD CONSTRAINT "maintenance_log_erledigt_von_user_id_fk" FOREIGN KEY ("erledigt_von") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;