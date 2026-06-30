import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FaultForm } from "@/components/fault-form";
import { updateFault } from "@/db/actions/faults";
import { db } from "@/db";
import { faults } from "@/db/schema";
import { requireMachineAccess } from "@/lib/session";

export default async function EditFaultPage({
  params,
}: {
  params: Promise<{ id: string; faultId: string }>;
}) {
  const { id, faultId } = await params;
  await requireMachineAccess(id);

  const fault = await db.query.faults.findFirst({
    where: and(eq(faults.id, faultId), eq(faults.machineId, id)),
  });
  if (!fault) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Fehler bearbeiten</h1>
      <FaultForm action={updateFault} machineId={id} fault={fault} />
    </div>
  );
}
