import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { DokumentForm, type DokumentArt } from "@/components/dokument-form";
import { PageHeader } from "@/components/ui/page-header";
import { updateDokument } from "@/db/actions/dokumente";
import { db } from "@/db";
import { machineDokumente } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import { modellName } from "@/lib/format";

export default async function EditDokumentPage({
  params,
}: {
  params: Promise<{ id: string; dokumentId: string }>;
}) {
  const { id, dokumentId } = await params;
  const { machine } = await requireMachineWrite(id);

  const d = await db.query.machineDokumente.findFirst({
    where: and(
      eq(machineDokumente.id, dokumentId),
      eq(machineDokumente.machineId, id),
    ),
  });
  if (!d) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Dokument bearbeiten · ${modellName(machine)}`}
        backHref={`/machines/${id}?bereich=dokumente`}
        backLabel="Zur Maschine"
      />
      <DokumentForm
        action={updateDokument}
        machineId={id}
        dokument={{
          id: d.id,
          typ: d.typ as DokumentArt,
          titel: d.titel,
          notiz: d.notiz,
          url: d.url,
          dateiname: d.dateiname,
        }}
      />
    </div>
  );
}
