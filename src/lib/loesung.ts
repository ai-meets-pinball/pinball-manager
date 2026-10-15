/*
  Die Lösung am Fehler (Feedback Dirk 10/2026): Ein behobener Fehler soll
  zeigen, WAS gemacht wurde — die Reparatur gab es, nur sah man sie an der
  Fehlerzeile nicht. Das Symptom lebt am Fehler, die Lösung an der Reparatur
  (CLAUDE.md, Constraint 4); hier wird nur entschieden, welche verknüpfte
  Reparatur und welcher Text in der Zeile erscheint.

  Vorrang: die jüngste ERLEDIGTE Reparatur; gibt es keine, die jüngste
  laufende (als solche gekennzeichnet). Text = Maßnahme, sonst Diagnose,
  einzeilig und auf 160 Zeichen gekürzt.
*/
export type VerknuepfteReparatur = {
  id: string;
  status: string;
  datum: Date;
  massnahme: string | null;
  diagnose: string | null;
};

export type Loesung = { repairId: string; art: string; text: string };

const MAX = 160;

export function loesungAmFehler(reparaturen: VerknuepfteReparatur[]): Loesung | null {
  if (reparaturen.length === 0) return null;
  const neueste = (liste: VerknuepfteReparatur[]) =>
    [...liste].sort((a, b) => b.datum.getTime() - a.datum.getTime())[0];
  const erledigt = reparaturen.filter((r) => r.status === "erledigt");
  const wahl = neueste(erledigt.length > 0 ? erledigt : reparaturen);

  const roh = (wahl.massnahme?.trim() || wahl.diagnose?.trim() || "").replace(/\s+/g, " ");
  const text = roh.length > MAX ? `${roh.slice(0, MAX - 1)}…` : roh;
  return { repairId: wahl.id, art: wahl.status, text };
}
