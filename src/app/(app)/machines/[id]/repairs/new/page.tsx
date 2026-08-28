import { desc, eq } from "drizzle-orm";
import { RepairForm } from "@/components/repair-form";
import { PageHeader } from "@/components/ui/page-header";
import { createRepair } from "@/db/actions/repairs";
import { db } from "@/db";
import { faults } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import { modellName } from "@/lib/format";

export default async function NewRepairPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ faultId?: string }>;
}) {
  const { id } = await params;
  const { faultId } = await searchParams;
  const { machine } = await requireMachineWrite(id);

  const machineFaults = await db.query.faults.findMany({
    where: eq(faults.machineId, id),
    columns: { id: true, beschreibung: true, status: true },
    orderBy: [desc(faults.datum)],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Neue Reparatur · ${modellName(machine)}`}
        backHref={`/machines/${id}?bereich=reparaturen`}
        backLabel="Zur Maschine"
      />
      <RepairForm
        action={createRepair}
        machineId={id}
        faults={machineFaults}
        selectedFaultIds={faultId ? [faultId] : []}
      />
    </div>
  );
}
