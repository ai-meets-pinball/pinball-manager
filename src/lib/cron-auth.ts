import { timingSafeEqual } from "node:crypto";

/*
  Absicherung der Cron-Routen (vercel.json): Vercel Cron sendet automatisch
  „Authorization: Bearer <CRON_SECRET>", wenn CRON_SECRET gesetzt ist — ohne
  gültiges Secret 401 (die Routen sind sonst öffentlich erreichbar). Eine
  Stelle für alle Cron-Routen statt einer Kopie je Route.
*/

/** Timing-sicherer Vergleich zweier Strings gleicher Bedeutung. */
function sicherGleich(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  // timingSafeEqual verlangt gleiche Länge — bei Ungleichheit trotzdem einen
  // konstant-zeitigen Vergleich gegen sich selbst fahren, dann false liefern.
  if (ba.length !== bb.length) {
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

/** true = Aufruf trägt das gültige CRON_SECRET. Fehlt das Secret: nie. */
export function cronBerechtigt(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  return Boolean(secret) && sicherGleich(auth, `Bearer ${secret}`);
}
