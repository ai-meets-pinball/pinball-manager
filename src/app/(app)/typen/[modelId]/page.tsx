import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SharedFacts } from "@/components/shared-facts";
import { SharedRepairs } from "@/components/shared-repairs";
import { Card } from "@/components/ui/card";
import {
  getMachineModel,
  getSharedFactsForModel,
  getSharedRepairsForModel,
} from "@/db/queries";
import { requireUser } from "@/lib/session";

/*
  Typ-Seite (die Klasse, z. B. „Monster Bash"): zeigt das für diesen Nutzer
  sichtbare geteilte Wissen dieses Gerätetyps — unabhängig davon, ob er selbst
  eine Instanz besitzt. Nutzt dieselben Queries wie die Maschinen-Detailseite,
  nur OHNE Instanz-Ausschluss, also inkl. Berechtigung + Feldprojektion.
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

  const [fakten, reparaturen] = await Promise.all([
    getSharedFactsForModel(currentUser, modelId),
    getSharedRepairsForModel(currentUser, modelId),
  ]);

  // SharedFacts rendert nur Einträge mit Faktenzeilen; leer, wenn keiner welche hat.
  const hatFakten = fakten.some((e) => e.fakten.length > 0);
  const hatReparaturen = reparaturen.length > 0;

  return (
    <div className="space-y-6">
      <Link
        href="/typen"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      >
        <ArrowLeft size={14} /> Gerätetypen
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        {model.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={model.imageUrl}
            alt={`${model.hersteller} ${model.modell}`}
            className="h-20 w-32 flex-none rounded-[var(--radius)] object-cover"
          />
        ) : null}
        <div>
          <h1 className="text-2xl font-bold">
            {model.hersteller} {model.modell}
          </h1>
          <p className="text-[var(--color-muted)]">
            {model.baujahr ?? "Baujahr unbekannt"} · Gerätetyp
          </p>
        </div>
      </div>

      {!hatFakten && !hatReparaturen ? (
        <Card>
          <p className="text-sm text-[var(--color-muted)]">
            Für diesen Gerätetyp wurde dir gegenüber noch nichts geteilt. Sobald
            jemand Handbuch-Daten oder Reparaturen dieses Automaten freigibt,
            erscheinen sie hier.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          <SharedFacts eintraege={fakten} eigeneVorhanden={false} />
          <SharedRepairs eintraege={reparaturen} />
        </div>
      )}
    </div>
  );
}
