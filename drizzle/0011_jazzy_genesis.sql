CREATE TABLE "club_settings" (
	"club_id" uuid PRIMARY KEY NOT NULL,
	"default_scope" text DEFAULT 'platform' NOT NULL,
	"default_anonym" boolean DEFAULT true NOT NULL,
	"default_zeige_kosten" boolean DEFAULT false NOT NULL,
	"auto_share_facts" boolean DEFAULT false NOT NULL,
	"auto_share_repairs" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"default_scope" text DEFAULT 'platform' NOT NULL,
	"default_anonym" boolean DEFAULT true NOT NULL,
	"default_zeige_kosten" boolean DEFAULT false NOT NULL,
	"auto_share_facts" boolean DEFAULT false NOT NULL,
	"auto_share_repairs" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "club_settings" ADD CONSTRAINT "club_settings_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;