import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { TerminForm } from "@/components/termin-form";
import { updateTermin } from "@/db/actions/termine";
import { db } from "@/db";
import { termine } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import { modellName } from "@/lib/format";

export default async function EditTerminPage({
  params,
}: {
  params: Promise<{ id: string; terminId: string }>;
}) {
  const { id, terminId } = await params;
  const { machine } = await requireMachineWrite(id);

  const t = await db.query.termine.findFirst({
    where: and(eq(termine.id, terminId), eq(termine.machineId, id)),
  });
  if (!t) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Termin bearbeiten · {modellName(machine)}
      </h1>
      <TerminForm
        action={updateTermin}
        machineId={id}
        termin={{
          id: t.id,
          titel: t.titel,
          notiz: t.notiz,
          datum: t.datum.toISOString().slice(0, 10),
          erinnerungTageVorher: t.erinnerungTageVorher,
          wiederholenMonate: t.wiederholenMonate,
        }}
      />
    </div>
  );
}
