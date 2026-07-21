import { MachineForm } from "@/components/machine-form";
import { updateMachine } from "@/db/actions/machines";
import { getUserClubs } from "@/db/queries";
import { requireMachineWrite } from "@/lib/session";

export default async function EditMachinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, machine } = await requireMachineWrite(id);
  const clubs = await getUserClubs(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {machine.hersteller} {machine.modell} bearbeiten
      </h1>
      <MachineForm action={updateMachine} clubs={clubs} machine={machine} />
    </div>
  );
}
