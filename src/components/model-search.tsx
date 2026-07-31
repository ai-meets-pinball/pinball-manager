"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  searchMachineModels,
  type ModelSearchResult,
} from "@/db/actions/models";
import { modellName } from "@/lib/format";

/*
  Typeahead über den EIGENEN Modell-Katalog (machine_models) — die primäre
  Auswahl beim Anlegen einer Maschine. Zeigt je Treffer Thumbnail, Name
  („Modell | Hersteller"), Baujahr und Generation; ein Klick liefert den vollen
  Datensatz an onSelect (kein zweiter Roundtrip wie beim OPDB-Weg).
  Debounce + latestReq-Guard wie in opdb-search.tsx.
*/
export function ModelSearch({
  onSelect,
}: {
  onSelect: (model: ModelSearchResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ModelSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Laufende Nummer der letzten Anfrage — verhindert, dass eine langsamere
  // frühere Antwort die Ergebnisse einer neueren Suche überschreibt.
  const latestReq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(() => {
      if (q.length < 2) {
        latestReq.current += 1;
        setResults([]);
        setError(null);
        return;
      }
      const reqId = ++latestReq.current;
      startTransition(async () => {
        try {
          const found = await searchMachineModels(q);
          if (reqId === latestReq.current) {
            setResults(found);
            setError(null);
          }
        } catch {
          if (reqId === latestReq.current) {
            setResults([]);
            setError("Katalog-Suche fehlgeschlagen. Bitte erneut versuchen.");
          }
        }
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function pick(model: ModelSearchResult) {
    latestReq.current += 1; // laufende Suchen entwerten
    setError(null);
    onSelect(model);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">Modell aus dem Katalog</span>
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Modell suchen, z. B. Godzilla…"
          className="pl-9"
          autoComplete="off"
        />
        {pending ? (
          <Loader2
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--color-muted)]"
          />
        ) : null}
      </div>

      {results.length > 0 ? (
        <ul className="overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)]">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => pick(r)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--color-border)]/40"
              >
                {r.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.imageUrl}
                    alt=""
                    className="h-9 w-12 flex-none rounded-[var(--radius)] object-cover"
                  />
                ) : (
                  <div className="h-9 w-12 flex-none rounded-[var(--radius)] bg-[var(--color-inset)]" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {modellName(r)}
                  </span>
                  <span className="block truncate text-xs text-[var(--color-muted)]">
                    {r.baujahr ?? "Baujahr unbekannt"}
                    {r.generationName ? ` · ${r.generationName}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <span className="text-xs text-[var(--color-danger)]">{error}</span>
      ) : (
        <span className="text-xs text-[var(--color-muted)]">
          Unsere Referenzliste (inkl. Generation) — füllt alle Felder aus.
        </span>
      )}
    </div>
  );
}
