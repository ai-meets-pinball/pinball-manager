/*
  Was beim Löschen einer Maschine ANDERE verlieren — und was sich retten lässt.
  Rein: keine DB, kein React. Die Action (db/actions/machines.ts) lädt die
  Zahlen bzw. Listen und ruft die Regel; die Detailseite zeigt den Satz.

  Hintergrund: Fehler, Reparaturen, Wartung sterben mit der Maschine (FK
  cascade) — das sagt die Löschfrage seit jeher. Nicht gesagt hat sie zwei
  Dinge: Reparaturen, die für andere FREIGEGEBEN waren (`shares`), sind für
  die weg; und Wissen, das noch an `knowledge.machine_id` hängt (Upload, als
  die Maschine kein Modell hatte), geht mit — außer es lässt sich ans Modell
  umhängen.
*/

export type Loeschfolgen = {
  /** Geteilte Reparaturen, die als Tipp am Modell weiterleben
      (lib/reparatur-tipp.befoerderbar: platform oder genau ein Club). */
  reparaturenBefoerdert: number;
  /** Geteilte Reparaturen, deren Freigabe ERLISCHT — an einzelne Personen
      oder an mehrere Clubs; das lässt sich nicht verlustfrei als Tipp abbilden. */
  freigegebeneReparaturen: number;
  /** Wissen an `machine_id`, das ans Modell umgehängt wird und bleibt. */
  wissenUebertragen: number;
  /** Wissen an `machine_id`, das andere sehen konnten und das verloren geht. */
  wissenVerloren: number;
};

function zahl(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** Die Löschfrage: der bekannte Grundsatz, dahinter nur die Folgen, die > 0 sind. */
export function loeschfrage(f: Loeschfolgen): string {
  const saetze = ["Diese Maschine samt Fehlern, Reparaturen und Wartungspunkten löschen?"];
  if (f.reparaturenBefoerdert > 0) {
    const n = f.reparaturenBefoerdert;
    saetze.push(
      n === 1
        ? "1 geteilte Reparatur bleibt als Tipp am Modell erhalten."
        : `${n} geteilte Reparaturen bleiben als Tipps am Modell erhalten.`,
    );
  }
  if (f.freigegebeneReparaturen > 0) {
    const n = f.freigegebeneReparaturen;
    saetze.push(
      n === 1
        ? "1 Reparatur ist für einzelne Personen oder mehrere Clubs freigegeben — diese Freigabe erlischt."
        : `${n} Reparaturen sind für einzelne Personen oder mehrere Clubs freigegeben — diese Freigaben erlöschen.`,
    );
  }
  if (f.wissenUebertragen > 0) {
    const n = f.wissenUebertragen;
    saetze.push(
      n === 1
        ? "1 Wissenseintrag wird ans Modell übertragen und bleibt erhalten."
        : `${zahl(n, "Wissenseintrag", "Wissenseinträge")} werden ans Modell übertragen und bleiben erhalten.`,
    );
  }
  if (f.wissenVerloren > 0) {
    const n = f.wissenVerloren;
    saetze.push(
      n === 1
        ? "1 Wissenseintrag hängt nur an dieser Maschine und geht für alle verloren."
        : `${zahl(n, "Wissenseintrag", "Wissenseinträge")} hängen nur an dieser Maschine und gehen für alle verloren.`,
    );
  }
  return saetze.join(" ");
}

/**
 * Welche maschinengebundenen Einträge dürfen ans Modell? `facts-store` hält je
 * Autor + Typ + Ebene EINEN Eintrag (Neu-Generierung aktualisiert in place) —
 * läge am Modell schon einer desselben Autors und Typs, wäre der umgehängte
 * eine Dublette. Die bleiben liegen und zählen als verloren.
 */
export function umhaengbar(
  anMaschine: { id: string; typ: string; createdBy: string }[],
  amModell: { typ: string; createdBy: string }[],
): { umhaengen: string[]; bleiben: string[] } {
  const belegt = new Set(amModell.map((e) => `${e.createdBy}|${e.typ}`));
  const umhaengen: string[] = [];
  const bleiben: string[] = [];
  for (const e of anMaschine) {
    (belegt.has(`${e.createdBy}|${e.typ}`) ? bleiben : umhaengen).push(e.id);
  }
  return { umhaengen, bleiben };
}
