"use client";

import { useRouter } from "next/navigation";
import { ModelSearch } from "@/components/model-search";

/*
  Suche über den GANZEN Modell-Katalog auf der Wissensbasis — die Liste darunter
  zeigt nur Modelle mit sichtbarem Wissen. Ein Treffer öffnet die Modell-Seite;
  dort lässt sich ein Handbuch auswerten, ohne das Gerät selbst zu besitzen.
*/
export function WissensbasisSuche() {
  const router = useRouter();
  return (
    <div className="max-w-xl space-y-1.5">
      <ModelSearch onSelect={(m) => router.push(`/modelle/${m.id}`)} />
      <p className="text-xs text-[var(--color-muted)]">
        Der ganze Katalog — auch Modelle, zu denen es noch kein Wissen gibt. Auf
        der Modell-Seite kannst du ein Handbuch auswerten.
      </p>
    </div>
  );
}
