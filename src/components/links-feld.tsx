"use client";

import { useState } from "react";
import { Link2, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { TippLink } from "@/lib/tipp-inhalt";

/*
  Wiederverwendbares Feld für weiterführende Links eines Tipps (Anlegen UND
  Bearbeiten). Jede Zeile: URL (Pflicht, sonst wird die Zeile serverseitig
  verworfen) + optional Name + Beschreibung. Die Werte reisen als drei
  INDEX-GLEICHE hidden-Input-Reihen (`linkUrl`/`linkName`/`linkBeschreibung`)
  im Submit mit — der Server zippt sie über `baueLinks` (lib/tipp-inhalt).
  Leere Zeilen bleiben ausgefüllt (auch leer), damit die Reihen ausgerichtet
  bleiben; ohne URL fallen sie beim Parsen weg.
*/
export function LinksFeld({
  defaultLinks = [],
}: {
  defaultLinks?: TippLink[];
}) {
  const [links, setLinks] = useState<TippLink[]>(() =>
    defaultLinks.map((l) => ({
      url: l.url,
      name: l.name ?? "",
      beschreibung: l.beschreibung ?? "",
    })),
  );

  const setFeld = (i: number, feld: keyof TippLink, wert: string) =>
    setLinks((alt) =>
      alt.map((l, j) => (j === i ? { ...l, [feld]: wert } : l)),
    );
  const hinzufuegen = () =>
    setLinks((alt) => [...alt, { url: "", name: "", beschreibung: "" }]);
  const entfernen = (i: number) =>
    setLinks((alt) => alt.filter((_, j) => j !== i));

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-medium">Links (optional)</span>
      {links.map((l, i) => (
        <div
          key={i}
          className="space-y-1.5 rounded-[var(--radius)] border border-[var(--color-border)] p-2"
        >
          <input type="hidden" name="linkUrl" value={l.url} />
          <input type="hidden" name="linkName" value={l.name ?? ""} />
          <input
            type="hidden"
            name="linkBeschreibung"
            value={l.beschreibung ?? ""}
          />
          <div className="flex items-center gap-2">
            <Link2
              size={14}
              className="flex-none text-[var(--color-muted)]"
              aria-hidden
            />
            <Input
              value={l.url}
              onChange={(e) => setFeld(i, "url", e.target.value)}
              placeholder="https://…"
              inputMode="url"
              aria-label="Link-Adresse"
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => entfernen(i)}
              aria-label="Link entfernen"
              className="flex-none rounded-[var(--radius)] p-1.5 text-[var(--color-muted)] hover:text-[var(--color-danger)]"
            >
              <X size={14} />
            </button>
          </div>
          <Input
            value={l.name ?? ""}
            onChange={(e) => setFeld(i, "name", e.target.value)}
            placeholder="Name (optional) — z. B. Forumsthread"
            aria-label="Link-Name"
          />
          <Input
            value={l.beschreibung ?? ""}
            onChange={(e) => setFeld(i, "beschreibung", e.target.value)}
            placeholder="Kurze Beschreibung (optional)"
            aria-label="Link-Beschreibung"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={hinzufuegen}
        className="inline-flex items-center gap-1.5 self-start rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      >
        <Plus size={14} /> Link hinzufügen
      </button>
    </div>
  );
}
