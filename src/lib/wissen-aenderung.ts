import type { TippLink } from "@/lib/tipp-inhalt";

/*
  Hat sich ein Wissenseintrag im Editor gegenüber dem gespeicherten Stand
  geändert? Reine Regel für den „Speichern"-Knopf (P2: kein dauerhaft aktives
  Speichern) — Titel, Inhaltstext (JSON oder Tipp-Text) und Links werden
  verglichen. Leere Link-Felder gelten wie weggelassene, damit ein unberührtes
  LinksFeld (Name "" statt undefined) nicht als Änderung zählt.
*/
export type WissenStand = {
  titel: string;
  inhalt: string;
  links: TippLink[];
};

function linkSchluessel(l: TippLink): string {
  return [l.url, l.name ?? "", l.beschreibung ?? ""]
    .map((s) => s.trim())
    .join("\n");
}

export function wissenUnveraendert(a: WissenStand, b: WissenStand): boolean {
  if (a.titel.trim() !== b.titel.trim()) return false;
  if (a.inhalt !== b.inhalt) return false;
  if (a.links.length !== b.links.length) return false;
  return a.links.every((l, i) => linkSchluessel(l) === linkSchluessel(b.links[i]));
}
