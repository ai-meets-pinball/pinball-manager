import { count, eq, isNotNull } from "drizzle-orm";
import { GenerationCreateForm } from "@/components/generation-create-form";
import { GenerationRow } from "@/components/generation-row";
import { Card } from "@/components/ui/card";
import { List } from "@/components/ui/list";
import { db } from "@/db";
import { generations, machineModels } from "@/db/schema";

/*
  Generationen (Super-Admin): die Board-/Hardware-Systeme (z. B. „WPC-95",
  „Stern SPIKE2") anlegen, umbenennen, löschen. Jede Zeile ist aufklappbar zu
  ihren Modellen; die Zuordnung Modell → Generation passiert auf /admin/modelle.
  Der Super-Admin-Guard sitzt im admin/layout.tsx.
*/
export default async function AdminGenerationenPage() {
  const genList = await db
    .select({
      id: generations.id,
      name: generations.name,
      jahrVon: generations.jahrVon,
      jahrBis: generations.jahrBis,
      anzahl: count(machineModels.id),
    })
    .from(generations)
    .leftJoin(machineModels, eq(machineModels.generationId, generations.id))
    .groupBy(generations.id)
    .orderBy(generations.name);

  // Modelle je Generation (für die Aufklapp-Liste der Zeilen).
  const zugeordnet = await db
    .select({
      hersteller: machineModels.hersteller,
      modell: machineModels.modell,
      baujahr: machineModels.baujahr,
      generationId: machineModels.generationId,
    })
    .from(machineModels)
    .where(isNotNull(machineModels.generationId))
    .orderBy(machineModels.modell, machineModels.hersteller);
  const proGeneration = new Map<
    string,
    { hersteller: string; modell: string; baujahr: number | null }[]
  >();
  for (const m of zugeordnet) {
    const liste = proGeneration.get(m.generationId!) ?? [];
    liste.push({
      hersteller: m.hersteller,
      modell: m.modell,
      baujahr: m.baujahr,
    });
    proGeneration.set(m.generationId!, liste);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--color-muted)]">
        Board-/Hardware-Systeme der Flipper-Geschichte. Einmal am Modell
        zugeordnet (auf der Modelle-Seite), gilt Generation-Wissen für alle
        Modelle des Systems.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Generationen ({genList.length})
        </h2>
        <Card>
          <GenerationCreateForm />
        </Card>
        <List empty="Noch keine Generationen — lege oben eine an.">
          {genList.map((g) => (
            <GenerationRow
              key={g.id}
              id={g.id}
              name={g.name}
              untertitel={`${g.anzahl} Modell(e)${
                g.jahrVon
                  ? ` · ${g.jahrVon}${g.jahrBis && g.jahrBis !== g.jahrVon ? `–${g.jahrBis}` : ""}`
                  : ""
              }`}
              modelle={proGeneration.get(g.id) ?? []}
            />
          ))}
        </List>
      </section>
    </div>
  );
}
