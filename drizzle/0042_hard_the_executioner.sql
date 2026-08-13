CREATE TABLE "mail_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kategorie" text NOT NULL,
	"empfaenger" text NOT NULL,
	"betreff" text NOT NULL,
	"inhalt" text,
	"feedback_id" uuid,
	"erfolg" boolean DEFAULT true NOT NULL,
	"fehler" text,
	"gesendet_am" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mail_log" ADD CONSTRAINT "mail_log_feedback_id_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_log" ENABLE ROW LEVEL SECURITY;