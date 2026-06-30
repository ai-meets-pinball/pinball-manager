import { FaultForm } from "@/components/fault-form";
import { createFault } from "@/db/actions/faults";
import { requireMachineAccess } from "@/lib/session";

export default async function NewFaultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { machine } = await requireMachineAccess(id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Neuer Fehler · {machine.hersteller} {machine.modell}
      </h1>
      <FaultForm action={createFault} machineId={id} />
    </div>
  );
}
