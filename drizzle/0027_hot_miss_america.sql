CREATE TABLE "maintenance_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"titel" text NOT NULL,
	"kategorie" text,
	"bauteil" text,
	"taetigkeit" text,
	"beschreibung" text,
	"prioritaet" "maintenance_prioritaet" DEFAULT 'mittel' NOT NULL,
	"intervall_typ" "maintenance_intervall_typ" DEFAULT 'bedarf' NOT NULL,
	"intervall_tage" integer,
	"intervall_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"user_id" text,
	"club_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "maintenance_plans_user_unique" UNIQUE("user_id"),
	CONSTRAINT "maintenance_plans_club_unique" UNIQUE("club_id"),
	CONSTRAINT "maintenance_plans_genau_ein_besitzer" CHECK (num_nonnulls("maintenance_plans"."user_id", "maintenance_plans"."club_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "maintenance_plan_id" uuid;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD COLUMN "plan_item_id" uuid;--> statement-breakpoint
ALTER TABLE "maintenance_plan_items" ADD CONSTRAINT "maintenance_plan_items_plan_id_maintenance_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."maintenance_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_maintenance_plan_id_maintenance_plans_id_fk" FOREIGN KEY ("maintenance_plan_id") REFERENCES "public"."maintenance_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_plan_item_id_maintenance_plan_items_id_fk" FOREIGN KEY ("plan_item_id") REFERENCES "public"."maintenance_plan_items"("id") ON DELETE set null ON UPDATE no action;