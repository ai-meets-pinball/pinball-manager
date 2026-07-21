import { MaintenanceTaskForm } from "@/components/maintenance-task-form";
import { createTask } from "@/db/actions/maintenance";
import { requireMachineWrite } from "@/lib/session";

export default async function NewMaintenanceTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { machine } = await requireMachineWrite(id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Neuer Wartungspunkt · {machine.hersteller} {machine.modell}
      </h1>
      <MaintenanceTaskForm action={createTask} machineId={id} />
    </div>
  );
}
