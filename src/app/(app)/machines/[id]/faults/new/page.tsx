import { CheckCircle2 } from "lucide-react";
import { FaultForm } from "@/components/fault-form";
import { PageHeader } from "@/components/ui/page-header";
import { createFault } from "@/db/actions/faults";
import { requireMachineWrite } from "@/lib/session";
import { modellName } from "@/lib/format";

export default async function NewFaultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ gespeichert?: string }>;
}) {
  const { id } = await params;
  const { gespeichert } = await searchParams;
  const { machine } = await requireMachineWrite(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Neuer Fehler · ${modellName(machine)}`}
        backHref={`/machines/${id}?bereich=fehler`}
        backLabel="Zur Maschine"
      />
      {gespeichert ? (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-[var(--color-success)]"
        >
          <CheckCircle2 size={16} /> Fehler gespeichert — hier gleich den nächsten erfassen.
        </p>
      ) : null}
      <FaultForm key={gespeichert ?? "neu"} action={createFault} machineId={id} />
    </div>
  );
}
