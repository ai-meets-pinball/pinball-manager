import type { HilfeSektion } from "@/lib/help-content";

/*
  Hilfe-Suche — die reine Regel (kein React, keine DB): welche Sektionen zu
  einem Suchbegriff passen. Trifft der Begriff Titel oder Einleitung, bleibt
  die Sektion komplett; sonst bleiben nur die Schritte, die ihn enthalten.
  Groß-/Kleinschreibung ist egal, sonst wird nichts normalisiert (»Fehler«
  findet »Fehlermeldung«, aber »Maschiene« findet nichts — das ist so gewollt).
*/
export function filtereHilfe<S extends HilfeSektion>(
  sektionen: readonly S[],
  q: string,
): S[] {
  const suche = q.trim().toLowerCase();
  if (!suche) return [...sektionen];
  const trifft = (text: string | undefined) =>
    Boolean(text && text.toLowerCase().includes(suche));

  const ergebnis: S[] = [];
  for (const sektion of sektionen) {
    if (trifft(sektion.titel) || trifft(sektion.einleitung)) {
      ergebnis.push(sektion);
      continue;
    }
    const schritte = sektion.schritte.filter(
      (s) => trifft(s.titel) || trifft(s.text),
    );
    if (schritte.length > 0) ergebnis.push({ ...sektion, schritte });
  }
  return ergebnis;
}
