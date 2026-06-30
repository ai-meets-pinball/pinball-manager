import { desc, eq } from "drizzle-orm";
import { RepairForm } from "@/components/repair-form";
import { createRepair } from "@/db/actions/repairs";
import { db } from "@/db";
import { faults } from "@/db/schema";
import { requireMachineAccess } from "@/lib/session";

export default async function NewRepairPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ faultId?: string }>;
}) {
  const { id } = await params;
  const { faultId } = await searchParams;
  const { machine } = await requireMachineAccess(id);

  const machineFaults = await db.query.faults.findMany({
    where: eq(faults.machineId, id),
    columns: { id: true, beschreibung: true, status: true },
    orderBy: [desc(faults.datum)],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Neue Reparatur · {machine.hersteller} {machine.modell}
      </h1>
      <RepairForm
        action={createRepair}
        machineId={id}
        faults={machineFaults}
        defaultFaultId={faultId}
      />
    </div>
  );
}
