import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { MaintenanceTaskForm } from "@/components/maintenance-task-form";
import { updateTask } from "@/db/actions/maintenance";
import { PageHeader } from "@/components/ui/page-header";
import { db } from "@/db";
import { maintenanceTasks } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { wartungspunktGesperrt } from "@/lib/faelligkeit";

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
  // Standard-verwaltet: kein Formular, das erst beim Speichern scheitert.
  const gesperrt = wartungspunktGesperrt(task);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wartungspunkt bearbeiten"
        backHref={`/machines/${id}?bereich=wartung`}
        backLabel="Zur Maschine"
      />
      {gesperrt ? (
        <Card className="space-y-2">
          <p className="text-sm">{gesperrt}</p>
          <Link
            href="/wartungsplaene"
            className="text-sm text-[var(--color-accent)] underline"
          >
            Zu den Wartungsplänen
          </Link>
        </Card>
      ) : (
        <MaintenanceTaskForm action={updateTask} machineId={id} task={task} />
      )}
    </div>
  );
}
