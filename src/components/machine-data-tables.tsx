import { FactTableView } from "@/components/fact-table-view";
import { factTableSchema, type FactType } from "@/lib/validators";

/*
  Anzeige der extrahierten Handbuch-Fakten im Stil einer WPC-Service-Console:
  monospaced, eingelassenes Panel, je Faktentyp eine Tabelle. Es werden nur
  Fakten dargestellt — nie der Handbuch-Text (der wird nie gespeichert).
*/

const LABELS: Record<FactType, string> = {
  coils: "Spulen",
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

  if (parsed.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Dashboard + Subnavigation: je Faktentyp eine Kennzahl-Karte, die zugleich
          als Sprungmarke zum Abschnitt dient. */}
      <nav
        aria-label="Handbuch-Abschnitte"
        className="grid grid-cols-3 gap-2 sm:grid-cols-6"
      >
        {parsed.map(({ typ, table }) => (
          <a
            key={typ}
            href={`#fact-${typ}`}
            className="group flex flex-col gap-0.5 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 transition-colors hover:border-[var(--color-primary)]"
          >
            <span className="font-mono text-xl font-bold leading-none text-[var(--color-primary)]">
              {table.rows.length}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--color-muted)] group-hover:text-[var(--color-fg)]">
              {LABELS[typ] ?? typ}
            </span>
          </a>
        ))}
      </nav>

      {parsed.map(({ typ, table }) => (
        <div key={typ} id={`fact-${typ}`} className="scroll-mt-24">
          <FactTableView typ={typ} label={LABELS[typ] ?? typ} table={table} />
        </div>
      ))}
    </div>
  );
}
