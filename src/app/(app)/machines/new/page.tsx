import { MachineForm } from "@/components/machine-form";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title="Neue Maschine"
        backHref="/machines"
        backLabel="Zu den Maschinen"
      />
      <MachineForm
        action={createMachine}
        backHref="/machines"
        clubs={clubs}
        besitzerKatalog={besitzerKatalog}
        mitglieder={mitglieder}
        aktuellerNutzer={{ id: user.id, name: user.name }}
      />
    </div>
  );
}
