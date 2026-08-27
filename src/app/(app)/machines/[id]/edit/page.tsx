import { MachineForm } from "@/components/machine-form";
import { PageHeader } from "@/components/ui/page-header";
import { updateMachine } from "@/db/actions/machines";
import {
  getBesitzerKatalog,
  getBesitzerNutzerKatalog,
  getMachineAusstattung,
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
  const ausstattung = await getMachineAusstattung(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${modellName(machine)} bearbeiten`}
        backHref={`/machines/${machine.id}`}
        backLabel="Zur Maschine"
      />
      <MachineForm
        action={updateMachine}
        backHref={`/machines/${machine.id}`}
        clubs={clubs}
        besitzerKatalog={besitzerKatalog}
        mitglieder={mitglieder}
        aktuellerNutzer={{ id: user.id, name: user.name }}
        machine={{ ...machine, besitzer, ausstattung }}
      />
    </div>
  );
}
