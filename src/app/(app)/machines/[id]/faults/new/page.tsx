import { FaultForm } from "@/components/fault-form";
import { PageHeader } from "@/components/ui/page-header";
import { createFault } from "@/db/actions/faults";
import { requireMachineWrite } from "@/lib/session";
import { modellName } from "@/lib/format";

export default async function NewFaultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { machine } = await requireMachineWrite(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Neuer Fehler · ${modellName(machine)}`}
        backHref={`/machines/${id}?bereich=fehler`}
        backLabel="Zur Maschine"
      />
      <FaultForm action={createFault} machineId={id} />
    </div>
  );
}
