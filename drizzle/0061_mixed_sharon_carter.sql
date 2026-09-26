CREATE TABLE "login_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"zeitpunkt" timestamp DEFAULT now() NOT NULL,
	"geraet" text
);
--> statement-breakpoint
CREATE TABLE "nutzung_tage" (
	"user_id" text NOT NULL,
	"tag" date NOT NULL,
	CONSTRAINT "nutzung_tage_user_id_tag_pk" PRIMARY KEY("user_id","tag")
);
--> statement-breakpoint
ALTER TABLE "login_log" ADD CONSTRAINT "login_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutzung_tage" ADD CONSTRAINT "nutzung_tage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "login_log_user_zeit" ON "login_log" USING btree ("user_id","zeitpunkt");
--> statement-breakpoint
ALTER TABLE "login_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "nutzung_tage" ENABLE ROW LEVEL SECURITY;