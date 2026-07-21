import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { MaintenanceTaskForm } from "@/components/maintenance-task-form";
import { updateTask } from "@/db/actions/maintenance";
import { db } from "@/db";
import { maintenanceTasks } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";

export default async function EditMaintenanceTaskPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id, taskId } = await params;
  await requireMachineWrite(id);

  const task = await db.query.maintenanceTasks.findFirst({
    where: and(
      eq(maintenanceTasks.id, taskId),
      eq(maintenanceTasks.machineId, id),
    ),
  });
  if (!task) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Wartungspunkt bearbeiten</h1>
      <MaintenanceTaskForm action={updateTask} machineId={id} task={task} />
    </div>
  );
}
