import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

/*
  Sortierbarer Tabellenkopf: die Spalte SELBST ist der Schalter, statt eines
  Selects über der Tabelle (siehe `SortRichtung`, das in der Kartenansicht
  bleibt — dort gibt es keinen Kopf zum Klicken). Zustand lebt weiter in der
  URL (`sort` + `dir`); die Seite reicht fertige Links herein, weil die Tabelle
  eine Client-Komponente ist und Funktionen die Grenze nicht überqueren.

  Klick auf eine inaktive Spalte sortiert nach ihr; Klick auf die aktive dreht
  die Richtung um.
*/
export function SortKopf({
  label,
  aktiv,
  dir,
  href,
  className = "py-2 pr-4 font-medium",
}: {
  label: string;
  /** Wird gerade nach dieser Spalte sortiert? */
  aktiv: boolean;
  /** Aktuelle Richtung — nur wenn `aktiv`, sonst egal. */
  dir: "auf" | "ab";
  /** Ziel: nach dieser Spalte sortieren bzw. die Richtung umkehren. */
  href: string;
  className?: string;
}) {
  const hinweis = !aktiv
    ? `Nach ${label} sortieren`
    : dir === "auf"
      ? `${label}, aufsteigend — umkehren`
      : `${label}, absteigend — umkehren`;

  return (
    <th
      className={className}
      aria-sort={!aktiv ? "none" : dir === "auf" ? "ascending" : "descending"}
    >
      <Link
        href={href}
        title={hinweis}
        aria-label={hinweis}
        className="inline-flex items-center gap-1 hover:text-[var(--color-fg)]"
      >
        {label}
        {!aktiv ? (
          <ChevronsUpDown size={12} className="text-[var(--color-faint)]" />
        ) : dir === "auf" ? (
          <ArrowUp size={12} />
        ) : (
          <ArrowDown size={12} />
        )}
      </Link>
    </th>
  );
}
