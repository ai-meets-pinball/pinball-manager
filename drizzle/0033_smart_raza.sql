-- HINWEIS: `ALTER TYPE "fault_prioritaet" ADD VALUE 'kritisch'` wurde hier
-- BEWUSST ENTFERNT und stattdessen out-of-band (Autocommit) angewandt:
-- drizzle-kit wickelt jede Migration in eine Transaktion, in der ADD VALUE
-- fehlschlägt (siehe Memory drizzle-migrate-supabase). Der Rest ist tx-sicher.
CREATE TYPE "public"."machine_status" AS ENUM('spielbereit', 'eingeschraenkt', 'ausser_betrieb');--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "status" "machine_status" DEFAULT 'spielbereit' NOT NULL;--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "status_seit" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "status_manuell" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "status_grund" text;--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "status_von" text;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_status_von_user_id_fk" FOREIGN KEY ("status_von") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;