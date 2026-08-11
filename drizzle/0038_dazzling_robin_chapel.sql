ALTER TABLE "machines" ALTER COLUMN "qr_token" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "machines" ALTER COLUMN "qr_token" SET DEFAULT substr(md5(gen_random_uuid()::text), 1, 12);--> statement-breakpoint
-- Bestandsdaten kürzen: aus den in 0037 erzeugten uuid-Tokens werden dieselben
-- kurzen 12-Hex-Codes wie bei neuen Zeilen (noch sind keine Etiketten gedruckt).
UPDATE "machines" SET "qr_token" = substr(md5("qr_token"), 1, 12);