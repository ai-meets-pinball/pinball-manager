CREATE TYPE "public"."fault_source" AS ENUM('geraet_qr', 'sammel_qr', 'app');--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "qr_token" text DEFAULT substr(md5(gen_random_uuid()::text), 1, 12) NOT NULL;--> statement-breakpoint
ALTER TABLE "faults" ADD COLUMN "quelle" "fault_source" DEFAULT 'app' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "qr_token" text;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_qr_token_unique" UNIQUE("qr_token");--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_qr_token_unique" UNIQUE("qr_token");