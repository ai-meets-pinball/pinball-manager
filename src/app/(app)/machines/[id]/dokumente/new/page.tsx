import { DokumentForm, type DokumentArt } from "@/components/dokument-form";
import { createDokument } from "@/db/actions/dokumente";
import { requireMachineWrite } from "@/lib/session";
import { modellName } from "@/lib/format";

const ARTEN = new Set(["link", "notiz", "datei"]);

export default async function NewDokumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ typ?: string }>;
}) {
  const { id } = await params;
  const { typ } = await searchParams;
  const { machine } = await requireMachineWrite(id);
  const defaultArt = (typ && ARTEN.has(typ) ? typ : "link") as DokumentArt;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Neues Dokument · {modellName(machine)}
      </h1>
      <DokumentForm
        action={createDokument}
        machineId={id}
        defaultArt={defaultArt}
      />
    </div>
  );
}
