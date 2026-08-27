import { TerminForm } from "@/components/termin-form";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title={`Neuer Termin · ${modellName(machine)}`}
        backHref={`/machines/${id}?bereich=termine`}
        backLabel="Zur Maschine"
      />
      <TerminForm action={createTermin} machineId={id} />
    </div>
  );
}
