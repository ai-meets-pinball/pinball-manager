import { notFound } from "next/navigation";
import { ManualExtract } from "@/components/manual-extract";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getKiZugang, getMachineModel } from "@/db/queries";
import { availableProviders } from "@/lib/ai/provider";
import { modellName } from "@/lib/format";
import { requireUser } from "@/lib/session";

/*
  „Handbuch auswerten" direkt am MODELL — dieselbe Seite wie an der Maschine
  (machines/[id]/handbuch/auswerten), nur ohne eigene Maschine: die Fakten hängen
  ohnehin am Modell. Jeder Angemeldete darf (eigener Eintrag, zunächst privat);
  die KI in der App bleibt dem Betreiber vorbehalten (lib/ki-zugang), alle
  anderen nehmen den Abo-Weg.
*/
export default async function ModellHandbuchAuswertenPage({
  params,
}: {
  params: Promise<{ modelId: string }>;
}) {
  const { modelId } = await params;
  const user = await requireUser();
  const model = await getMachineModel(modelId);
  if (!model) notFound();

  const ki = await getKiZugang(user);
  const kiHandbuch = ki.handbuch;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Handbuch auswerten · ${modellName(model)}`}
        backHref={`/modelle/${model.id}?bereich=handbuch`}
        backLabel="Zum Modell"
      />
      <Card className="space-y-4">
        <ManualExtract
          einstieg={{ art: "modell", id: model.id }}
          providers={availableProviders()}
          centralKey={Boolean(process.env.ANTHROPIC_API_KEY)}
          byoErlaubt={ki.byo}
          appErlaubt={kiHandbuch.erlaubt}
          appGrund={kiHandbuch.erlaubt ? undefined : kiHandbuch.grund}
        />
      </Card>
    </div>
  );
}
