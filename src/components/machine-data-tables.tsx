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
      {parsed.map(({ typ, table }) => (
        <div
          key={typ}
          className="overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
            <span className="font-mono text-[11px] uppercase tracking-[1px] text-[var(--color-faint)]">
              {LABELS[typ] ?? typ}
            </span>
            <span className="font-mono text-[11px] text-[var(--color-faint)]">
              {table.rows.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-xs">
              {table.columns.length > 0 ? (
                <thead>
                  <tr>
                    {table.columns.map((c, i) => (
                      <th
                        key={i}
                        className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-2 text-left font-semibold text-[var(--color-muted)]"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
              ) : null}
              <tbody>
                {table.rows.map((row, r) => (
                  <tr key={r} className="odd:bg-[var(--color-overlay)]">
                    {row.map((cell, c) => (
                      <td
                        key={c}
                        className="whitespace-nowrap px-3 py-1.5 text-[var(--color-fg)]"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
