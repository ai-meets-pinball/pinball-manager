CREATE TABLE "share_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"share_id" uuid NOT NULL,
	"club_id" uuid,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artefakt_typ" text NOT NULL,
	"artefakt_id" uuid NOT NULL,
	"model_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"scope" text NOT NULL,
	"anonym" boolean DEFAULT true NOT NULL,
	"zeige_kosten" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shares_artefakt_unique" UNIQUE("artefakt_typ","artefakt_id")
);
--> statement-breakpoint
ALTER TABLE "share_targets" ADD CONSTRAINT "share_targets_share_id_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."shares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_targets" ADD CONSTRAINT "share_targets_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_targets" ADD CONSTRAINT "share_targets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_model_id_machine_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."machine_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;