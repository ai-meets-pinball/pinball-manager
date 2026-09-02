import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { ICON_BTN } from "@/components/ui/icon-button";

/*
  Sortierrichtung als kleiner Pfeil-Knopf neben dem Sortier-Select — statt
  einer eigenen Zeile „Sortieren: Neueste · Name↑ · Baujahr". Zustand lebt in
  der URL (`dir`), der Link dreht ihn um.
*/
export function SortRichtung({
  dir,
  href,
}: {
  dir: "auf" | "ab";
  /** Ziel mit umgekehrter Richtung. */
  href: string;
}) {
  const label = dir === "auf" ? "aufsteigend — umkehren" : "absteigend — umkehren";
  return (
    <Link href={href} aria-label={label} title={label} className={ICON_BTN}>
      {dir === "auf" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
    </Link>
  );
}
