CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "email_templates_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;