CREATE TABLE "ki_aufrufe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"zweck" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ki_aufrufe" ADD CONSTRAINT "ki_aufrufe_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ki_aufrufe_user_zeit" ON "ki_aufrufe" USING btree ("user_id","created_at");
--> statement-breakpoint
ALTER TABLE "ki_aufrufe" ENABLE ROW LEVEL SECURITY;