CREATE TABLE "knowledge_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"knowledge_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"typ" text DEFAULT 'ausblenden' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_overrides_unique" UNIQUE("knowledge_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "knowledge_overrides" ADD CONSTRAINT "knowledge_overrides_knowledge_id_knowledge_id_fk" FOREIGN KEY ("knowledge_id") REFERENCES "public"."knowledge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_overrides" ADD CONSTRAINT "knowledge_overrides_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;