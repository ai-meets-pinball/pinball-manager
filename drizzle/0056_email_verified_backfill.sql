-- Offene Registrierung mit Pflicht-Verifikation: ab jetzt darf sich nur anmelden,
-- wessen Adresse bestätigt ist (Better Auth `requireEmailVerification`).
-- Alle bisherigen Konten sind über einen Einladungs-TOKEN aus der E-Mail (oder
-- den Bootstrap der leeren Installation) entstanden — das Postfach ist damit
-- belegt. Sie werden als bestätigt markiert, sonst wären sie ausgesperrt.
UPDATE "user" SET "email_verified" = true WHERE "email_verified" = false;
