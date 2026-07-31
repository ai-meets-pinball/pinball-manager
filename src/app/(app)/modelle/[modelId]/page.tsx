import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { KnowledgeFacts } from "@/components/knowledge-facts";
import { KnowledgeGuides } from "@/components/knowledge-guides";
import { SharedRepairs } from "@/components/shared-repairs";
import { Card } from "@/components/ui/card";
import {
  getMachineModel,
  getModelGuides,
  getModelKnowledge,
  getSharedRepairsForModel,
} from "@/db/queries";
import { requireUser } from "@/lib/session";
import { modellName } from "@/lib/format";

/*
  Typ-Seite (die Klasse, z. B. „Monster Bash"): zeigt das für diesen Nutzer
  sichtbare Handbuch-Wissen (knowledge, Modell-Ebene) + geteilte Reparaturen —
  unabhängig davon, ob er selbst eine Instanz besitzt. Eigene Wissenseinträge
  lassen sich hier in der Sichtbarkeit ändern.
*/
export default async function GeraetetypPage({
  params,
}: {
  params: Promise<{ modelId: string }>;
}) {
  const { modelId } = await params;
  const currentUser = await requireUser();

  const model = await getMachineModel(modelId);
  if (!model) notFound();

  const [fakten, guides, reparaturen] = await Promise.all([
    getModelKnowledge(currentUser, modelId),
    getModelGuides(currentUser, modelId),
    getSharedRepairsForModel(currentUser, modelId),
  ]);

  const leer =
    fakten.length === 0 && guides.length === 0 && reparaturen.length === 0;

  return (
    <div className="space-y-6">
      <Link
        href="/modelle"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      >
        <ArrowLeft size={14} /> Modelle
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        {model.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={model.imageUrl}
            alt={modellName(model)}
            className="h-20 w-32 flex-none rounded-[var(--radius)] object-cover"
          />
        ) : null}
        <div>
          <h1 className="text-2xl font-bold">
            {modellName(model)}
          </h1>
          <p className="text-[var(--color-muted)]">
            {model.baujahr ?? "Baujahr unbekannt"} · Modell
          </p>
        </div>
      </div>

      {leer ? (
        <Card>
          <p className="text-sm text-[var(--color-muted)]">
            Für dieses Modell ist dir gegenüber noch kein Wissen sichtbar.
            Sobald jemand Handbuch-Daten oder Reparaturen freigibt, erscheinen sie
            hier.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {fakten.length > 0 ? (
            <KnowledgeFacts
              eintraege={fakten}
              currentUserId={currentUser.id}
              machineId=""
            />
          ) : null}
          {guides.length > 0 ? (
            <KnowledgeGuides
              eintraege={guides}
              currentUserId={currentUser.id}
              machineId=""
            />
          ) : null}
          <SharedRepairs eintraege={reparaturen} />
        </div>
      )}
    </div>
  );
}
