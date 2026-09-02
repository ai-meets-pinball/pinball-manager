import { count, eq } from "drizzle-orm";
import { GenerationAnlegen } from "@/components/generation-create-form";
import { GenerationRow } from "@/components/generation-row";
import { List } from "@/components/ui/list";
import { db } from "@/db";
import { generations, machineModels } from "@/db/schema";

/*
  Generationen (Super-Admin): die Board-/Hardware-Systeme (z. B. „WPC-95",
  „Stern SPIKE2") anlegen, umbenennen, löschen. Die Modelle einer Generation
  stehen nicht hier, sondern hinter dem Link der Modellzahl auf /admin/modelle
  (dort passiert auch die Zuordnung Modell → Generation).
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

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--color-muted)]">
        Board-/Hardware-Systeme der Flipper-Geschichte. Einmal am Modell
        zugeordnet (auf der Modelle-Seite), gilt Generation-Wissen für alle
        Modelle des Systems.
      </p>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Generationen ({genList.length})
          </h2>
          <GenerationAnlegen />
        </div>
        <List empty="Noch keine Generationen.">
          {genList.map((g) => (
            <GenerationRow
              key={g.id}
              id={g.id}
              name={g.name}
              modelle={g.anzahl}
              zeitraum={
                g.jahrVon
                  ? `${g.jahrVon}${g.jahrBis && g.jahrBis !== g.jahrVon ? `–${g.jahrBis}` : ""}`
                  : null
              }
            />
          ))}
        </List>
      </section>
    </div>
  );
}
