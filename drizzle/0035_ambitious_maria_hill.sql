CREATE TABLE "machine_besitzer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"club_id" uuid,
	"created_by" text NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "besitzer_id" uuid;--> statement-breakpoint
ALTER TABLE "machine_besitzer" ADD CONSTRAINT "machine_besitzer_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_besitzer" ADD CONSTRAINT "machine_besitzer_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_besitzer" ADD CONSTRAINT "machine_besitzer_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "machine_besitzer_club_name_unique" ON "machine_besitzer" USING btree ("club_id",lower("name")) WHERE club_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "machine_besitzer_privat_name_unique" ON "machine_besitzer" USING btree ("created_by",lower("name")) WHERE club_id IS NULL;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_besitzer_id_machine_besitzer_id_fk" FOREIGN KEY ("besitzer_id") REFERENCES "public"."machine_besitzer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- RLS-Lockdown (siehe 0032): ENABLE ohne Policies = deny-all für die Supabase
-- Data-API; die App verbindet sich als Tabellen-Owner und ist nicht betroffen.
ALTER TABLE "machine_besitzer" ENABLE ROW LEVEL SECURITY;
