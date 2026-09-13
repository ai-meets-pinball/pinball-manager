import { Eye } from "lucide-react";
import { MachineDataTables } from "@/components/machine-data-tables";
import { TroubleshootingGuideView } from "@/components/troubleshooting-guide";
import { inhaltToFacts } from "@/lib/import-facts";
import { BEISPIEL_FAKTEN, BEISPIEL_GUIDE } from "@/lib/wissen-beispiel";

/*
  Vorschau in leeren Reitern: so sieht es aus, wenn Daten da sind — mit
  DENSELBEN Komponenten wie die echten Einträge (MachineDataTables,
  TroubleshootingGuideView) und den Beispieldaten aus lib/wissen-beispiel.
  Zugeklappt per <details>, damit der leere Reiter ruhig bleibt; klar als
  Beispiel beschriftet, damit niemand die Werte für echt hält.
*/
export function WissenVorschau({ art }: { art: "fakten" | "guide" }) {
  return (
    <details className="group rounded-[var(--radius)] border border-dashed border-[var(--color-border)] px-3 py-2">
      <summary className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium">
        <Eye size={15} />
        {art === "fakten"
          ? "Vorschau: so sehen Handbuch-Daten aus"
          : "Vorschau: so sieht ein Guide aus"}
      </summary>
      <div className="mt-3 space-y-2">
        <p className="text-xs text-[var(--color-muted)]">
          Beispiel mit erfundenen Werten eines WPC-95-Geräts — nicht die Daten
          dieser Maschine. Die echten Einträge erscheinen genau so, nur mit dem
          Inhalt deines Handbuchs bzw. deines Guides.
        </p>
        {art === "fakten" ? (
          <MachineDataTables facts={inhaltToFacts(BEISPIEL_FAKTEN)} />
        ) : (
          <TroubleshootingGuideView
            daten={BEISPIEL_GUIDE}
            model="Beispiel"
            createdAt={new Date("2026-09-01T12:00:00Z")}
          />
        )}
      </div>
    </details>
  );
}
