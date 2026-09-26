import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FaultForm } from "@/components/fault-form";
import { updateFault } from "@/db/actions/faults";
import { PageHeader } from "@/components/ui/page-header";
import { db } from "@/db";
import { faults, machines, roleAssignments, user } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";

export default async function EditFaultPage({
  params,
}: {
  params: Promise<{ id: string; faultId: string }>;
}) {
  const { id, faultId } = await params;
  await requireMachineWrite(id);

  const fault = await db.query.faults.findFirst({
    where: and(eq(faults.id, faultId), eq(faults.machineId, id)),
  });
  if (!fault) notFound();

  // Wählbare Melder = Geltungsbereich der Maschine: Club-Maschine → die
  // Mitglieder, private → der Eigentümer. Ein bisheriger Melder, der nicht
  // (mehr) dazugehört, bleibt als Option stehen, damit Speichern ohne Änderung
  // ihn nicht stillschweigend austauscht.
  const machine = await db.query.machines.findFirst({
    where: eq(machines.id, id),
    columns: { clubId: true, ownerId: true },
  });
  const optionen = machine?.clubId
    ? await db
        .select({ userId: roleAssignments.userId, name: user.name })
        .from(roleAssignments)
        .innerJoin(user, eq(user.id, roleAssignments.userId))
        .where(eq(roleAssignments.clubId, machine.clubId))
        .orderBy(user.name)
    : await db
        .select({ userId: user.id, name: user.name })
        .from(user)
        .where(eq(user.id, machine?.ownerId ?? ""));
  if (fault.gemeldetVon && !optionen.some((o) => o.userId === fault.gemeldetVon)) {
    const bisher = await db.query.user.findFirst({
      where: eq(user.id, fault.gemeldetVon),
      columns: { id: true, name: true },
    });
    if (bisher) optionen.unshift({ userId: bisher.id, name: bisher.name });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fehler bearbeiten"
        backHref={`/machines/${id}?bereich=fehler`}
        backLabel="Zur Maschine"
      />
      <FaultForm
        action={updateFault}
        machineId={id}
        fault={fault}
        melder={{
          optionen,
          userId: fault.gemeldetVon,
          gastName: fault.gemeldetVonName,
        }}
      />
    </div>
  );
}
