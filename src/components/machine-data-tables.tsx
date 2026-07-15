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
      {parsed.map(({ typ, table }) => (
        <FactTableView key={typ} typ={typ} label={LABELS[typ] ?? typ} table={table} />
      ))}
    </div>
  );
}
