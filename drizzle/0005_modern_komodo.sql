ALTER TABLE "memberships" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "memberships" CASCADE;--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "role_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invitations" DROP COLUMN "rolle";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "role";--> statement-breakpoint
DROP TYPE "public"."club_role";