-- Custom SQL migration file, put your code below! --
-- RLS-Lockdown für die Supabase-Data-API (PostgREST).
--
-- Supabase stellt unter /rest/v1/ eine öffentliche REST-API über alle Tabellen
-- im public-Schema bereit — erreichbar mit dem Anon-Key, komplett VORBEI an
-- der Autorisierung dieser App. Ohne RLS waren damit alle Tabellen lesbar
-- (inkl. Passwort-Hashes, Session- und Einladungs-Tokens).
--
-- Der Fix: Row Level Security auf JEDER Tabelle AKTIVIEREN, aber bewusst
-- KEINE einzige Policy anlegen. RLS ohne Policies = deny-all für die Data-API
-- (anon/authenticated). Die App selbst bleibt völlig unberührt: sie verbindet
-- sich als `postgres` — der EIGENTÜMER der Tabellen umgeht RLS (kein FORCE).
--
-- Das ist KEINE Abkehr von "Autorisierung in der App-Schicht" (PRD §3, §7):
-- es gibt weiterhin null Zugriffslogik in der Datenbank. RLS ist hier nur das
-- Türschloss an einer Seitentür, die diese App nie benutzt.
--
-- WICHTIG für die Zukunft: jede NEUE Tabelle braucht in ihrer Migration
-- ebenfalls ein ENABLE ROW LEVEL SECURITY — sonst steht die Tür wieder offen.
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "club_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clubs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "faults" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "generations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "knowledge" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "knowledge_overrides" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "knowledge_revisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "knowledge_signals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "machine_models" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "machines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "maintenance_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "maintenance_plan_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "maintenance_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "repair_faults" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "repairs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "role_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "share_targets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shares" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
