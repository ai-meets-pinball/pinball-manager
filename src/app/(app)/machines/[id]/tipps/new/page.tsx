import { TippFormular } from "@/components/tipp-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getMachineDetail } from "@/db/machine-detail";
import { getTippZielKatalog } from "@/db/queries";
import { modellName } from "@/lib/format";
import { requireMachineWrite } from "@/lib/session";

/*
  „Tipp hinzufügen" als eigene Seite statt als Dialog (Redlining 2026-09-13):
  Titel, formatierter Text, Links und der gestufte Ziel-Picker brauchen Platz
  — und eine URL. Nach dem Speichern geht es zurück in den Tipps-Reiter.
*/
export default async function NeuerTippPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { machine } = await requireMachineWrite(id);
  const [{ wissen }, katalog] = await Promise.all([
    getMachineDetail(id),
    getTippZielKatalog(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Tipp hinzufügen · ${modellName(machine)}`}
        backHref={`/machines/${id}?bereich=tipps`}
        backLabel="Zu den Tipps"
      />
      <Card>
        <TippFormular
          machineId={machine.id}
          modelle={katalog.modelle}
          generationen={katalog.generationen}
          vorauswahlModelId={
            // Der Picker zeigt je Familie EINEN Eintrag — den treffen, der die
            // eigene Edition enthält.
            katalog.modelle.find((m) => m.ids.includes(machine.modelId ?? ""))?.id ??
            machine.modelId ??
            ""
          }
          eigenerOpdbRef={machine.opdbRef}
          eigeneGeneration={wissen.generation}
          zurueck={`/machines/${id}?bereich=tipps`}
        />
      </Card>
    </div>
  );
}
