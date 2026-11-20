/*
  Suche im Fehler-Reiter (Feedback Dirk 10/2026: „wo finde ich, wie wir das
  letztes Mal gelöst haben?"). Reine Regel, ohne DB: ein Fehler passt, wenn der
  Begriff im Symptom (Beschreibung), in der Kategorie ODER in Diagnose bzw.
  Maßnahme einer verknüpften Reparatur steht — das Symptom lebt am Fehler, die
  Lösung an der Reparatur (CLAUDE.md, Constraint 4), gesucht wird über beides.
  Wie die Hilfe-Suche: Groß-/Kleinschreibung egal, sonst keine Normalisierung.
*/
export type SuchbarerFehler = {
  beschreibung: string;
  kategorie: string | null;
  reparaturen: { diagnose: string | null; massnahme: string | null }[];
};

export function fehlerPasst(f: SuchbarerFehler, q: string): boolean {
  const suche = q.trim().toLowerCase();
  if (!suche) return true;
  const trifft = (text: string | null) =>
    Boolean(text && text.toLowerCase().includes(suche));
  return (
    trifft(f.beschreibung) ||
    trifft(f.kategorie) ||
    f.reparaturen.some((r) => trifft(r.diagnose) || trifft(r.massnahme))
  );
}
