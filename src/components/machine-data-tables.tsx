"use client";

import { useState } from "react";
import { FactTableView } from "@/components/fact-table-view";
import { factTableSchema, type FactType } from "@/lib/validators";

/*
  Anzeige der extrahierten Handbuch-Fakten im Stil einer WPC-Service-Console:
  monospaced, eingelassenes Panel, je Faktentyp eine Tabelle. Es werden nur
  Fakten dargestellt — nie der Handbuch-Text (der wird nie gespeichert).
*/

const LABELS: Record<FactType, string> = {
  coils: "Spulen & Flasher",
  switches: "Schalter-Matrix",
  lamps: "Lampen-Matrix",
  fuses: "Sicherungen",
  parts: "Teileliste",
  rules: "Regeln / Adjustments",
};

const ORDER: FactType[] = ["coils", "switches", "lamps", "fuses", "parts", "rules"];

type Row = { typ: string; daten: unknown };

export function MachineDataTables({ facts }: { facts: Row[] }) {
  // Nur gültige Faktentabellen, in fester Reihenfolge.
  const parsed = facts
    .map((f) => {
      const res = factTableSchema.safeParse(f.daten);
      return res.success ? { typ: f.typ as FactType, table: res.data } : null;
    })
    .filter((x): x is { typ: FactType; table: ReturnType<typeof factTableSchema.parse> } => x !== null)
    .sort((a, b) => ORDER.indexOf(a.typ) - ORDER.indexOf(b.typ));

  // Welche Bereiche sind aufgeklappt (kontrolliert, damit KPI-Karten aufklappen).
  const [open, setOpen] = useState<Set<FactType>>(new Set());
  const setTyp = (typ: FactType, isOpen: boolean) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(typ);
      else next.delete(typ);
      return next;
    });

  if (parsed.length === 0) return null;

  // Klick auf eine KPI-Karte: Bereich aufklappen UND dorthin scrollen.
  const openAndScroll = (typ: FactType) => {
    setTyp(typ, true);
    document
      .getElementById(`fact-${typ}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-4">
      {/* Dashboard + Subnavigation: je Faktentyp eine Kennzahl-Karte, die den
          Abschnitt aufklappt und dorthin scrollt. */}
      <nav
        aria-label="Handbuch-Abschnitte"
        className="grid grid-cols-3 gap-2 sm:grid-cols-6"
      >
        {parsed.map(({ typ, table }) => (
          <button
            key={typ}
            type="button"
            onClick={() => openAndScroll(typ)}
            className="group flex flex-col gap-0.5 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-left transition-colors hover:border-[var(--color-primary)]"
          >
            <span className="font-mono text-xl font-bold leading-none text-[var(--color-primary)]">
              {table.rows.length}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--color-muted)] group-hover:text-[var(--color-fg)]">
              {LABELS[typ] ?? typ}
            </span>
          </button>
        ))}
      </nav>

      {parsed.map(({ typ, table }) => (
        <div key={typ} id={`fact-${typ}`} className="scroll-mt-24">
          <FactTableView
            typ={typ}
            label={LABELS[typ] ?? typ}
            table={table}
            open={open.has(typ)}
            onToggle={(o) => setTyp(typ, o)}
          />
        </div>
      ))}
    </div>
  );
}
