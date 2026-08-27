import { TerminForm } from "@/components/termin-form";
import { createTermin } from "@/db/actions/termine";
import { requireMachineWrite } from "@/lib/session";
import { modellName } from "@/lib/format";

export default async function NewTerminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { machine } = await requireMachineWrite(id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Neuer Termin · {modellName(machine)}</h1>
      <TerminForm action={createTermin} machineId={id} />
    </div>
  );
}
