CREATE TABLE "prompt_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"hersteller" text,
	"generation_id" uuid,
	"vorlage" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "prompt_overrides_scope_unique" UNIQUE NULLS NOT DISTINCT("key","hersteller","generation_id")
);
--> statement-breakpoint
ALTER TABLE "prompt_overrides" ADD CONSTRAINT "prompt_overrides_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_overrides" ADD CONSTRAINT "prompt_overrides_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_overrides" ENABLE ROW LEVEL SECURITY;
