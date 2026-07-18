/*
  Bootstrap-Allowlist für Super-Admins (Komma-Liste in der Env).

  Liegt bewusst in einem eigenen Modul: lib/auth.ts UND lib/session.ts brauchen
  sie, und session.ts importiert auth.ts — ein gemeinsamer Import hier vermeidet
  den Zirkelbezug.

  Zwei Aufgaben:
  1. Diese Konten werden beim nächsten Request automatisch Super-Admin (session.ts).
  2. Sie dürfen sich auch OHNE Einladung registrieren (auth.ts) — sonst wäre eine
     frische Installation ausgesperrt, weil ohne Nutzer niemand einladen kann.
*/
export const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function istSuperAdminEmail(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
