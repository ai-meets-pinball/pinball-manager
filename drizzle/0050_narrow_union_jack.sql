ALTER TABLE "whatsapp_log" ADD COLUMN "machine_id" uuid;--> statement-breakpoint
ALTER TABLE "whatsapp_log" ADD COLUMN "recipient_user_id" text;--> statement-breakpoint
ALTER TABLE "whatsapp_log" ADD CONSTRAINT "whatsapp_log_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_log" ADD CONSTRAINT "whatsapp_log_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;