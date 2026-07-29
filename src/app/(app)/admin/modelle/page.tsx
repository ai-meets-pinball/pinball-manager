import { count, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { CatalogImport } from "@/components/catalog-import";
import { ModelGenerationSelect } from "@/components/model-generation-select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteGeneration, renameGeneration } from "@/db/actions/generations";
import { db } from "@/db";
import { generations, machineModels } from "@/db/schema";
import { isSuperAdmin, requireUser } from "@/lib/session";
import { GenerationCreateForm } from "@/components/generation-create-form";

/*
  Flippermasterliste (Super-Admin, Datenmodell-Redesign Phase 4a): Generationen
  (Board-/Hardware-Systeme) verwalten und jedem Gerätetyp eine Generation
  zuordnen. Erstbefüllung über den Katalog-Import; neue/lückenhafte Modelle per
  Hand. Die Generation-Ebene im Wissens-Resolver folgt separat.
*/
export default async function AdminModellePage() {
  const me = await requireUser();
  if (!isSuperAdmin(me)) redirect("/machines");

  const genList = await db
    .select({
      id: generations.id,
      name: generations.name,
      hersteller: generations.hersteller,
      jahrVon: generations.jahrVon,
      jahrBis: generations.jahrBis,
      anzahl: count(machineModels.id),
    })
    .from(generations)
    .leftJoin(machineModels, eq(machineModels.generationId, generations.id))
    .groupBy(generations.id)
    .orderBy(generations.name);

  const modelle = await db
    .select({
      id: machineModels.id,
      hersteller: machineModels.hersteller,
      modell: machineModels.modell,
      opdbRef: machineModels.opdbRef,
      generationId: machineModels.generationId,
      generationName: generations.name,
      manuell: machineModels.generationManuell,
    })
    .from(machineModels)
    .leftJoin(generations, eq(generations.id, machineModels.generationId))
    .orderBy(machineModels.hersteller, machineModels.modell);

  const genOptionen = genList.map((g) => ({ id: g.id, name: g.name }));
  const mitGeneration = modelle.filter((m) => m.generationId).length;
  const vonHand = modelle.filter((m) => m.manuell).length;
  const ohne = modelle.length - mitGeneration;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          <ArrowLeft size={14} /> Administration
        </Link>
        <h1 className="text-2xl font-bold">Flippermasterliste</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Generationen (Board-/Hardware-Systeme) und ihre Zuordnung zu den
          Gerätetypen. {modelle.length} Modelle · {mitGeneration} mit Generation
          {" · "}
          {vonHand} von Hand · {ohne} ohne.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Katalog importieren</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Export-JSON aus dem Schwesterprojekt (Feld <code>machines</code> mit{" "}
          <code>opdbId</code> + <code>generation</code>). Der Import legt fehlende
          Generationen an und ordnet Modelle über den OPDB-Bezug zu. Er ist
          wiederholbar und lässt von Hand gesetzte Zuordnungen unangetastet.
        </p>
        <Card>
          <CatalogImport />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Generationen ({genList.length})</h2>
        <Card className="space-y-4">
          <GenerationCreateForm />

          {genList.length > 0 ? (
            <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
              {genList.map((g) => (
                <div
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <form
                    action={renameGeneration}
                    className="flex flex-1 items-center gap-2"
                  >
                    <input type="hidden" name="id" value={g.id} />
                    <Input
                      name="name"
                      defaultValue={g.name}
                      className="max-w-xs"
                      aria-label="Generation umbenennen"
                    />
                    <span className="text-xs text-[var(--color-muted)]">
                      {g.anzahl} Modell(e)
                      {g.jahrVon
                        ? ` · ${g.jahrVon}${g.jahrBis && g.jahrBis !== g.jahrVon ? `–${g.jahrBis}` : ""}`
                        : ""}
                    </span>
                    <Button type="submit" variant="secondary" className="text-xs">
                      Umbenennen
                    </Button>
                  </form>
                  <form action={deleteGeneration}>
                    <input type="hidden" name="id" value={g.id} />
                    <button
                      type="submit"
                      aria-label="Generation löschen"
                      title="Löschen — die Zuordnung der Modelle entfällt"
                      className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                    >
                      <Trash2 size={16} />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              Noch keine Generationen — importiere den Katalog oder lege eine an.
            </p>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Modelle ({modelle.length})</h2>
        <div className="space-y-2">
          {modelle.map((m) => (
            <Card
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {m.hersteller} {m.modell}
                </p>
                <p className="truncate font-mono text-xs text-[var(--color-faint)]">
                  {m.opdbRef}
                  {m.manuell ? (
                    <span className="ml-2 font-sans text-[var(--color-muted)]">
                      · von Hand
                    </span>
                  ) : null}
                </p>
              </div>
              <ModelGenerationSelect
                modelId={m.id}
                generationen={genOptionen}
                aktuell={m.generationId}
                manuell={m.manuell}
              />
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
