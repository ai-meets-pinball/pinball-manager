import { MachineForm } from "@/components/machine-form";
import { createMachine } from "@/db/actions/machines";
import { getUserClubs } from "@/db/queries";
import { requireUser } from "@/lib/session";

export default async function NewMachinePage() {
  const user = await requireUser();
  const clubs = await getUserClubs(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Neue Maschine</h1>
      <MachineForm action={createMachine} clubs={clubs} />
    </div>
  );
}
