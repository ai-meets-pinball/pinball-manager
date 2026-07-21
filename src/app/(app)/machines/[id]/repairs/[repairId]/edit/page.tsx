import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { RepairForm } from "@/components/repair-form";
import { updateRepair } from "@/db/actions/repairs";
import { db } from "@/db";
import { faults, repairs } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";

export default async function EditRepairPage({
  params,
}: {
  params: Promise<{ id: string; repairId: string }>;
}) {
  const { id, repairId } = await params;
  await requireMachineWrite(id);

  const repair = await db.query.repairs.findFirst({
    where: and(eq(repairs.id, repairId), eq(repairs.machineId, id)),
  });
  if (!repair) notFound();

  const machineFaults = await db.query.faults.findMany({
    where: eq(faults.machineId, id),
    columns: { id: true, beschreibung: true, status: true },
    orderBy: [desc(faults.datum)],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reparatur bearbeiten</h1>
      <RepairForm
        action={updateRepair}
        machineId={id}
        faults={machineFaults}
        repair={repair}
      />
    </div>
  );
}
