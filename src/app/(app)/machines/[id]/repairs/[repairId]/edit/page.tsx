import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { RepairForm } from "@/components/repair-form";
import { updateRepair } from "@/db/actions/repairs";
import { PageHeader } from "@/components/ui/page-header";
import { db } from "@/db";
import { faults, repairFaults, repairs } from "@/db/schema";
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

  // Bereits verknüpfte Fehler (n:m) für die Vorauswahl.
  const verknuepft = await db.query.repairFaults.findMany({
    where: eq(repairFaults.repairId, repairId),
    columns: { faultId: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reparatur bearbeiten"
        backHref={`/machines/${id}?bereich=reparaturen`}
        backLabel="Zur Maschine"
      />
      <RepairForm
        action={updateRepair}
        machineId={id}
        faults={machineFaults}
        repair={repair}
        selectedFaultIds={verknuepft.map((v) => v.faultId)}
      />
    </div>
  );
}
