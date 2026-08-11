ALTER TABLE "faults" ADD COLUMN "gemeldet_von_name" text;--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "qr_token" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_qr_token_unique" UNIQUE("qr_token");