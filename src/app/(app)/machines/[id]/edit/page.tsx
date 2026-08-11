import { MachineForm } from "@/components/machine-form";
import { updateMachine } from "@/db/actions/machines";
import {
  getBesitzerKatalog,
  getBesitzerNutzerKatalog,
  getMachineBesitzer,
  getUserClubs,
} from "@/db/queries";
import { requireMachineWrite } from "@/lib/session";
import { modellName } from "@/lib/format";

export default async function EditMachinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, machine } = await requireMachineWrite(id);
  const clubs = await getUserClubs(user.id);
  const besitzerKatalog = await getBesitzerKatalog(user);
  const mitglieder = await getBesitzerNutzerKatalog(user);
  const besitzer = await getMachineBesitzer(id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{modellName(machine)} bearbeiten</h1>
      <MachineForm
        action={updateMachine}
        clubs={clubs}
        besitzerKatalog={besitzerKatalog}
        mitglieder={mitglieder}
        aktuellerNutzer={{ id: user.id, name: user.name }}
        machine={{ ...machine, besitzer }}
      />
    </div>
  );
}
