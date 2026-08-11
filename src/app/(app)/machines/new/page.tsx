import { MachineForm } from "@/components/machine-form";
import { createMachine } from "@/db/actions/machines";
import {
  getBesitzerKatalog,
  getBesitzerNutzerKatalog,
  getUserClubs,
} from "@/db/queries";
import { requireUser } from "@/lib/session";

export default async function NewMachinePage() {
  const user = await requireUser();
  const clubs = await getUserClubs(user.id);
  const besitzerKatalog = await getBesitzerKatalog(user);
  const mitglieder = await getBesitzerNutzerKatalog(user);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Neue Maschine</h1>
      <MachineForm
        action={createMachine}
        clubs={clubs}
        besitzerKatalog={besitzerKatalog}
        mitglieder={mitglieder}
        aktuellerNutzer={{ id: user.id, name: user.name }}
      />
    </div>
  );
}
