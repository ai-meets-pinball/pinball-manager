import type { TippInhalt } from "@/lib/tipp-inhalt";

/*
  Eine geteilte Reparatur zum Tipp „befördern" — die Brücke aus dem
  Datenmodell-Redesign (docs/pinball-manager-datenmodell.md, „Die Brücke"),
  gebaut für den Fall, dass die Maschine gelöscht wird: die Reparatur stirbt
  mit ihr (FK cascade), das Wissen daraus soll am Modell bleiben.

  Rein: keine DB. Die Action (db/actions/machines.ts) lädt die Freigaben, ruft
  `befoerderbar` und `tippAusReparatur` und schreibt den Tipp; die Löschfrage
  (lib/loeschfolgen) zählt mit derselben Regel, was bleibt und was erlischt.
*/

export type FreigabeKandidat = {
  scope: "platform" | "club" | "users";
  clubIds: string[];
  anonym: boolean;
  zeigeKosten: boolean;
  reparatur: {
    datum: Date;
    diagnose: string | null;
    massnahme: string | null;
    teile: string | null;
    kosten: string | null;
    zeit: number | null;
    faultBeschreibung: string | null;
    faultKategorie: string | null;
  };
};

/**
 * Lässt sich die Reichweite der Freigabe verlustfrei auf einen Tipp abbilden?
 * Ein Tipp kennt „öffentlich" und „EIN Club". Freigaben an mehrere Clubs oder
 * an einzelne Personen haben kein Gegenstück — die erlöschen (und die
 * Löschfrage sagt es), statt still weiter oder enger gefasst zu werden.
 */
export function befoerderbar(
  k: Pick<FreigabeKandidat, "scope" | "clubIds">,
): { visibility: "oeffentlich"; clubId: null } | { visibility: "club"; clubId: string } | null {
  if (k.scope === "platform") return { visibility: "oeffentlich", clubId: null };
  if (k.scope === "club" && k.clubIds.length === 1) {
    return { visibility: "club", clubId: k.clubIds[0] };
  }
  return null;
}

const TITEL_MAX = 80;

/** Titel und Tipp-Inhalt aus der Reparatur — nur gefüllte Felder, Kosten und
    Aufwand nur, wenn die Freigabe sie zeigte. */
export function tippAusReparatur(k: FreigabeKandidat): { titel: string; inhalt: TippInhalt } {
  const r = k.reparatur;
  const zeilen: string[] = [];
  if (r.faultBeschreibung) {
    zeilen.push(
      `Symptom: ${r.faultBeschreibung}${r.faultKategorie ? ` (${r.faultKategorie})` : ""}`,
    );
  }
  if (r.diagnose) zeilen.push(`Diagnose: ${r.diagnose}`);
  if (r.massnahme) zeilen.push(`Maßnahme: ${r.massnahme}`);
  if (r.teile) zeilen.push(`Teile: ${r.teile}`);
  if (k.zeigeKosten) {
    const teile: string[] = [];
    if (r.kosten != null) {
      teile.push(
        `Kosten: ${Number(r.kosten).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
      );
    }
    if (r.zeit != null) teile.push(`Aufwand: ${r.zeit} min`);
    if (teile.length > 0) zeilen.push(teile.join(" · "));
  }
  zeilen.push(
    `Repariert am ${r.datum.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}.`,
  );
  zeilen.push("Übernommen aus einer Reparatur, als die Maschine gelöscht wurde.");

  const kern = r.faultBeschreibung ?? r.diagnose ?? r.massnahme ?? "ohne Beschreibung";
  const voll = `Reparatur: ${kern}`;
  const titel = voll.length > TITEL_MAX ? `${voll.slice(0, TITEL_MAX - 1).trimEnd()}…` : voll;

  return { titel, inhalt: { text: zeilen.join("\n"), links: [] } };
}
