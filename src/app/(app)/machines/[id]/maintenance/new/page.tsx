import { MaintenanceTaskForm } from "@/components/maintenance-task-form";
import { PageHeader } from "@/components/ui/page-header";
import { createTask } from "@/db/actions/maintenance";
import { requireMachineWrite } from "@/lib/session";
import { modellName } from "@/lib/format";

export default async function NewMaintenanceTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { machine } = await requireMachineWrite(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Neuer Wartungspunkt · ${modellName(machine)}`}
        backHref={`/machines/${id}?bereich=wartung`}
        backLabel="Zur Maschine"
      />
      <MaintenanceTaskForm action={createTask} machineId={id} />
    </div>
  );
}
