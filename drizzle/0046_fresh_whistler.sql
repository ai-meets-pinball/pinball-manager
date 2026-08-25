ALTER TABLE "maintenance_plans" DROP CONSTRAINT "maintenance_plans_user_unique";--> statement-breakpoint
ALTER TABLE "maintenance_plans" DROP CONSTRAINT "maintenance_plans_club_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "maintenance_plans_user_name_unique" ON "maintenance_plans" USING btree ("user_id",lower("name")) WHERE user_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "maintenance_plans_club_name_unique" ON "maintenance_plans" USING btree ("club_id",lower("name")) WHERE club_id IS NOT NULL;