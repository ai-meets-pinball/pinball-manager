import { and, count, eq, ilike, isNull, or } from "drizzle-orm";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { CatalogImport } from "@/components/catalog-import";
import { GenerationCreateForm } from "@/components/generation-create-form";
import { ModelGenerationSelect } from "@/components/model-generation-select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/input";
import { List, ListRow } from "@/components/ui/list";
import { Pagination } from "@/components/ui/pagination";
import { SearchToolbar } from "@/components/ui/search-toolbar";
import { deleteGeneration, renameGeneration } from "@/db/actions/generations";
import { db } from "@/db";
import { generations, machineModels } from "@/db/schema";

/*
  Gerätetypen (Super-Admin): Generationen (Board-/Hardware-Systeme) verwalten und
  jedem Gerätetyp eine Generation zuordnen. Bei hunderten Modellen mit Suche +
  Pagination; die Kennzahlen zählen serverseitig über den GANZEN Bestand.
  Der Super-Admin-Guard sitzt im admin/layout.tsx.
*/
const PRO_SEITE = 30;

export default async function AdminModellePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; seite?: string; ohne?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const nurOhne = sp.ohne === "1";
  const seite = Math.max(1, Number(sp.seite) || 1);

  // Generationen (für Dropdown + Verwaltung) — überschaubar, komplett laden.
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
  const genOptionen = genList.map((g) => ({ id: g.id, name: g.name }));

  // Kennzahlen über den GANZEN Bestand (unabhängig von Suche/Seite).
  const [{ gesamt }] = await db.select({ gesamt: count() }).from(machineModels);
  const [{ ohneGen }] = await db
    .select({ ohneGen: count() })
    .from(machineModels)
    .where(isNull(machineModels.generationId));

  // Filter der Modell-Liste: Suche (Hersteller/Modell/OPDB) + „nur ohne Generation".
  const filter = and(
    q
      ? or(
          ilike(machineModels.hersteller, `%${q}%`),
          ilike(machineModels.modell, `%${q}%`),
          ilike(machineModels.opdbRef, `%${q}%`),
        )
      : undefined,
    nurOhne ? isNull(machineModels.generationId) : undefined,
  );

  const [{ treffer }] = await db
    .select({ treffer: count() })
    .from(machineModels)
    .where(filter);
  const seiten = Math.max(1, Math.ceil(treffer / PRO_SEITE));
  const aktuelleSeite = Math.min(seite, seiten);

  const modelle = await db
    .select({
      id: machineModels.id,
      hersteller: machineModels.hersteller,
      modell: machineModels.modell,
      opdbRef: machineModels.opdbRef,
      imageUrl: machineModels.imageUrl,
      generationId: machineModels.generationId,
      manuell: machineModels.generationManuell,
    })
    .from(machineModels)
    .where(filter)
    .orderBy(machineModels.hersteller, machineModels.modell)
    .limit(PRO_SEITE)
    .offset((aktuelleSeite - 1) * PRO_SEITE);

  // Beim Blättern zu erhaltende Query-Werte (Suche + Filter).
  const params = {
    ...(q ? { q } : {}),
    ...(nurOhne ? { ohne: "1" } : {}),
  };

  return (
    <div className="space-y-8">
      <p className="text-sm text-[var(--color-muted)]">
        Generationen (Board-/Hardware-Systeme) und ihre Zuordnung zu den
        Gerätetypen. {gesamt} Modelle ·{" "}
        <Link href="/admin/modelle?ohne=1" className="hover:underline">
          {ohneGen} ohne Generation
        </Link>
        .
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Katalog importieren</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Export-JSON aus dem Schwesterprojekt (Feld <code>machines</code> mit{" "}
          <code>opdbId</code> + <code>generation</code>). Legt fehlende
          Generationen an und ordnet Modelle über den OPDB-Bezug zu; wiederholbar,
          Hand-Zuordnungen bleiben unangetastet.
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
                    <Button type="submit" variant="secondary" size="sm">
                      Umbenennen
                    </Button>
                  </form>
                  <form action={deleteGeneration}>
                    <input type="hidden" name="id" value={g.id} />
                    <ConfirmButton
                      question="Generation löschen? Die Zuordnung der Modelle entfällt."
                      confirmLabel="Ja, löschen"
                      aria-label="Generation löschen"
                    >
                      <Trash2 size={16} />
                    </ConfirmButton>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Modelle ({treffer})</h2>
          <SearchToolbar
            placeholder="Hersteller, Modell oder OPDB-Ref …"
            defaultValue={q}
            label="Modelle suchen"
            keep={nurOhne ? { ohne: "1" } : {}}
            resetHref="/admin/modelle"
          />
        </div>

        <List empty="Keine Modelle gefunden.">
          {modelle.map((m) => (
            <ListRow
              key={m.id}
              leading={
                m.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.imageUrl}
                    alt=""
                    className="h-12 w-16 rounded-[var(--radius)] object-cover"
                  />
                ) : (
                  <div className="h-12 w-16 rounded-[var(--radius)] bg-[var(--color-inset)]" />
                )
              }
              title={`${m.hersteller} ${m.modell}`}
              subtitle={
                <span className="font-mono text-xs">
                  {m.opdbRef}
                  {m.manuell ? (
                    <span className="ml-2 font-sans text-[var(--color-muted)]">
                      · von Hand
                    </span>
                  ) : null}
                </span>
              }
              actions={
                <ModelGenerationSelect
                  modelId={m.id}
                  generationen={genOptionen}
                  aktuell={m.generationId}
                  manuell={m.manuell}
                />
              }
            />
          ))}
        </List>

        <Pagination
          page={aktuelleSeite}
          pages={seiten}
          basePath="/admin/modelle"
          params={params}
        />
      </section>
    </div>
  );
}
