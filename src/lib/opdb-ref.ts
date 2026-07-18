/*
  OPDB-Referenzen zerlegen.

  OPDB kennt drei Ebenen (Beispiel Godzilla):
    Gruppe / Titel   G50Wr              — alle Editionen zusammen
    Maschine/Edition G50Wr-MLeZP        — z. B. Premium (das ist unser Gerätetyp)
    Alias            G50Wr-MLeZP-A1B2C  — Variante derselben Edition

  Bewusst eine eigene, REINE Datei: lib/opdb.ts trägt "use server" und darf
  deshalb ausschließlich async Funktionen exportieren. Dieser Parser wird auch
  in Migrationen/Server-Actions synchron gebraucht.
*/

export type OpdbRefTeile = {
  /** Erster Abschnitt = Gruppe/Titel (z. B. "G50Wr"). */
  groupRef: string;
  /** Gruppe + Edition (z. B. "G50Wr-MLeZP") — unser Gerätetyp-Schlüssel. */
  machineRef: string | null;
  /** true, wenn die Referenz NUR eine Gruppe ist (keine Edition). */
  istGruppe: boolean;
};

/** Zerlegt eine OPDB-Referenz. Liefert null bei leerer/ungültiger Eingabe. */
export function parseOpdbRef(ref: string | null | undefined): OpdbRefTeile | null {
  const s = ref?.trim();
  if (!s) return null;

  const teile = s.split("-").filter(Boolean);
  const groupRef = teile[0];
  if (!groupRef) return null;

  return {
    groupRef,
    machineRef: teile.length >= 2 ? `${teile[0]}-${teile[1]}` : null,
    istGruppe: teile.length === 1,
  };
}

/** Der Gerätetyp-Schlüssel zu einer Referenz: Edition, sonst null.
    Eine reine Gruppen-Referenz taugt NICHT als Gerätetyp (Editionen haben
    unterschiedliche Spulen-/Schalter-Matrizen). */
export function modelKeyFromOpdbRef(ref: string | null | undefined): string | null {
  return parseOpdbRef(ref)?.machineRef ?? null;
}
