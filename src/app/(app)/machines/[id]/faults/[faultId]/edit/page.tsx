import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FaultForm } from "@/components/fault-form";
import { updateFault } from "@/db/actions/faults";
import { PageHeader } from "@/components/ui/page-header";
import { db } from "@/db";
import { faults } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";

export default async function EditFaultPage({
  params,
}: {
  params: Promise<{ id: string; faultId: string }>;
}) {
  const { id, faultId } = await params;
  await requireMachineWrite(id);

  const fault = await db.query.faults.findFirst({
    where: and(eq(faults.id, faultId), eq(faults.machineId, id)),
  });
  if (!fault) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fehler bearbeiten"
        backHref={`/machines/${id}?bereich=fehler`}
        backLabel="Zur Maschine"
      />
      <FaultForm action={updateFault} machineId={id} fault={fault} />
    </div>
  );
}
