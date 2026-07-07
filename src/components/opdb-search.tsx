"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  getOpdbMachine,
  searchOpdb,
  type OpdbMachine,
  type OpdbSearchResult,
} from "@/lib/opdb";

/*
  Suchfeld, das die OPDB per Typeahead abfragt. Wählt man einen Treffer aus,
  werden die vollen Maschinendaten geholt und über onSelect an das Formular
  gereicht, das damit seine Felder füllt.
*/
export function OpdbSearch({
  onSelect,
}: {
  onSelect: (machine: OpdbMachine) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpdbSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Laufende Nummer der letzten Anfrage — verhindert, dass eine langsamere
  // frühere Antwort die Ergebnisse einer neueren Suche überschreibt.
  const latestReq = useRef(0);

  // Suche mit kleiner Verzögerung (Debounce), damit nicht jeder Tastendruck feuert.
  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(() => {
      if (q.length < 2) {
        latestReq.current += 1; // laufende Anfragen entwerten
        setResults([]);
        setError(null);
        return;
      }
      const reqId = ++latestReq.current;
      startTransition(async () => {
        try {
          const found = await searchOpdb(q);
          if (reqId === latestReq.current) {
            setResults(found);
            setError(null);
          }
        } catch {
          if (reqId === latestReq.current) {
            setResults([]);
            setError("OPDB-Suche fehlgeschlagen. Bitte später erneut versuchen.");
          }
        }
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function pick(id: string) {
    latestReq.current += 1; // laufende Suchen entwerten, damit sie die Auswahl nicht überschreiben
    setError(null);
    startTransition(async () => {
      try {
        const machine = await getOpdbMachine(id);
        onSelect(machine);
        setQuery("");
        setResults([]);
      } catch {
        setError("OPDB-Details konnten nicht geladen werden.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">Aus OPDB übernehmen</span>
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Maschine suchen, z. B. Godzilla…"
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
                onClick={() => pick(r.id)}
                className="w-full px-3 py-2 text-left hover:bg-[var(--color-border)]/40"
              >
                {r.text}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <span className="text-xs text-red-500">{error}</span>
      ) : (
        <span className="text-xs text-[var(--color-muted)]">
          Füllt Hersteller, Modell, Baujahr und die Referenzen automatisch aus.
        </span>
      )}
    </div>
  );
}
