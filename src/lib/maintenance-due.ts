/*
  Fälligkeits-Helfer (rein, kein "use server") — geteilt von
  db/actions/maintenance.ts und db/actions/maintenance-plans.ts.
  Nur zeitbasierte Intervalle ergeben einen Termin.
*/
export function addDays(base: Date, tage: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + tage);
  return d;
}

export function computeDue(
  intervallTyp: string,
  intervallTage: number | null,
  ab: Date,
): Date | null {
  return intervallTyp === "zeit" && intervallTage && intervallTage > 0
    ? addDays(ab, intervallTage)
    : null;
}
