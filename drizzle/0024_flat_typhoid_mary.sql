CREATE TABLE "knowledge_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"knowledge_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"wert" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_signals_unique" UNIQUE("knowledge_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "knowledge_signals" ADD CONSTRAINT "knowledge_signals_knowledge_id_knowledge_id_fk" FOREIGN KEY ("knowledge_id") REFERENCES "public"."knowledge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_signals" ADD CONSTRAINT "knowledge_signals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;