import { and, asc, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import Link from "next/link";
import { LayoutGrid, Table2 } from "lucide-react";
import { ViewToggle } from "@/components/ui/view-toggle";
import { ModelGenerationSelect } from "@/components/model-generation-select";
import { AutoSubmitSelect } from "@/components/ui/auto-submit-select";
import { List, ListRow } from "@/components/ui/list";
import { Pagination } from "@/components/ui/pagination";
import { SearchToolbar } from "@/components/ui/search-toolbar";
import { db } from "@/db";
import { generations, machineModels } from "@/db/schema";
import { modellName } from "@/lib/format";

/*
  Modelle (Super-Admin): der Modell-Katalog — durchsuchbar (Text), filterbar
  (Generation) und sortierbar (Name/Baujahr). Die Zuordnung Modell → Generation
  passiert hier per Stift; die Generationen selbst werden auf
  /admin/generationen gepflegt. Kennzahlen zählen serverseitig über den GANZEN
  Bestand. Der Super-Admin-Guard sitzt im admin/layout.tsx.

  Query-Parameter (deutsche Konvention): q (Suche), gen (Generation-id | "ohne"),
  sort (name | jahr), dir (auf | ab), ansicht (karten | tabelle), seite.
*/
const PRO_SEITE = 30;

export default async function AdminModellePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    gen?: string;
    sort?: string;
    dir?: string;
    ansicht?: string;
    seite?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const gen = sp.gen ?? "";
  const sort = sp.sort === "jahr" ? "jahr" : "name";
  const dir = sp.dir === "ab" ? "ab" : "auf";
  const ansicht = sp.ansicht === "tabelle" ? "tabelle" : "karten";
  const seite = Math.max(1, Number(sp.seite) || 1);

  // Generationen für Filter + Zuordnungs-Select.
  const genOptionen = await db
    .select({ id: generations.id, name: generations.name })
    .from(generations)
    .orderBy(generations.name);

  // Kennzahlen über den GANZEN Bestand (unabhängig von Suche/Seite).
  const [{ gesamt }] = await db.select({ gesamt: count() }).from(machineModels);
  const [{ ohneGen }] = await db
    .select({ ohneGen: count() })
    .from(machineModels)
    .where(isNull(machineModels.generationId));

  // Filter: Textsuche (Hersteller/Modell/OPDB) + Generation ("ohne" = keine).
  const filter = and(
    q
      ? or(
          ilike(machineModels.hersteller, `%${q}%`),
          ilike(machineModels.modell, `%${q}%`),
          ilike(machineModels.opdbRef, `%${q}%`),
        )
      : undefined,
    gen === "ohne"
      ? isNull(machineModels.generationId)
      : gen
        ? eq(machineModels.generationId, gen)
        : undefined,
  );

  // Sortierung: Name (Modell zuerst — passend zur Anzeige „Modell | Hersteller")
  // oder Baujahr — NULLS LAST, damit Modelle ohne Jahr ans Ende fallen.
  const sortierung =
    sort === "jahr"
      ? dir === "ab"
        ? [sql`${machineModels.baujahr} DESC NULLS LAST`]
        : [sql`${machineModels.baujahr} ASC NULLS LAST`]
      : dir === "ab"
        ? [desc(machineModels.modell), desc(machineModels.hersteller)]
        : [asc(machineModels.modell), asc(machineModels.hersteller)];

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
      baujahr: machineModels.baujahr,
      opdbRef: machineModels.opdbRef,
      imageUrl: machineModels.imageUrl,
      generationId: machineModels.generationId,
    })
    .from(machineModels)
    .where(filter)
    .orderBy(...sortierung)
    .limit(PRO_SEITE)
    .offset((aktuelleSeite - 1) * PRO_SEITE);

  // Nicht-Default-Parameter — von Pagination/Sortier-Links zu erhalten.
  const params: Record<string, string> = {
    ...(q ? { q } : {}),
    ...(gen ? { gen } : {}),
    ...(sort !== "name" ? { sort } : {}),
    ...(dir !== "auf" ? { dir } : {}),
    ...(ansicht === "tabelle" ? { ansicht } : {}),
  };

  /* Sortier-Link: Klick auf die aktive Spalte dreht die Richtung um; sonst
     Spalte wechseln (aufsteigend). Seite fällt dabei bewusst auf 1 zurück. */
  const sortHref = (key: "name" | "jahr") => {
    const p = new URLSearchParams({
      ...(q ? { q } : {}),
      ...(gen ? { gen } : {}),
      ...(ansicht === "tabelle" ? { ansicht } : {}),
    });
    if (key !== "name") p.set("sort", key);
    if (sort === key && dir === "auf") p.set("dir", "ab");
    const qs = p.toString();
    return `/admin/modelle${qs ? `?${qs}` : ""}`;
  };

  /* Ansicht-Umschalter (Karten mit Bild / kompakte Tabelle) — Zustand lebt in
     der URL wie alles andere; Seite und Filter bleiben erhalten. */
  const ansichtHref = (a: "karten" | "tabelle") => {
    const p = new URLSearchParams(params);
    p.delete("ansicht");
    if (a === "tabelle") p.set("ansicht", "tabelle");
    if (aktuelleSeite > 1) p.set("seite", String(aktuelleSeite));
    const qs = p.toString();
    return `/admin/modelle${qs ? `?${qs}` : ""}`;
  };
  const sortLabel = (key: "name" | "jahr", label: string) => (
    <Link
      href={sortHref(key)}
      className={
        sort === key
          ? "font-medium text-[var(--color-primary)]"
          : "text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      }
    >
      {label}
      {sort === key ? (dir === "auf" ? " ↑" : " ↓") : ""}
    </Link>
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--color-muted)]">
        Der Modell-Katalog. {gesamt} Modelle ·{" "}
        <Link href="/admin/modelle?gen=ohne" className="hover:underline">
          {ohneGen} ohne Generation
        </Link>
        .
      </p>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Modelle ({treffer})</h2>
          <div className="flex flex-wrap items-center gap-3">
            <SearchToolbar
              placeholder="Hersteller, Modell oder OPDB-Ref …"
              defaultValue={q}
              label="Modelle suchen"
              keep={{
                ...(sort !== "name" ? { sort } : {}),
                ...(dir !== "auf" ? { dir } : {}),
                ...(ansicht === "tabelle" ? { ansicht } : {}),
              }}
              resetHref="/admin/modelle"
              aktiv={Boolean(q || gen)}
            >
              <AutoSubmitSelect
                name="gen"
                defaultValue={gen}
                aria-label="Nach Generation filtern"
                className="max-w-56"
              >
                <option value="">Alle Generationen</option>
                <option value="ohne">— ohne Generation —</option>
                {genOptionen.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </AutoSubmitSelect>
            </SearchToolbar>
            <ViewToggle
              options={[
                {
                  href: ansichtHref("karten"),
                  label: "Kartenansicht",
                  icon: <LayoutGrid size={16} />,
                  active: ansicht === "karten",
                },
                {
                  href: ansichtHref("tabelle"),
                  label: "Tabellenansicht",
                  icon: <Table2 size={16} />,
                  active: ansicht === "tabelle",
                },
              ]}
            />
          </div>
        </div>

        <p className="text-sm">
          <span className="text-[var(--color-muted)]">Sortieren: </span>
          {sortLabel("name", "Name")}
          <span className="text-[var(--color-faint)]"> · </span>
          {sortLabel("jahr", "Baujahr")}
        </p>

        {ansicht === "tabelle" ? (
          /* Kompakte Tabellen-Ansicht (ohne Bilder) — für schnelles Scannen
             vieler Zeilen. Die Karten-Ansicht bleibt der Standard. */
          modelle.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              Keine Modelle gefunden.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-[0.06em] text-[var(--color-muted)]">
                    <th className="py-2 pr-4 font-medium">Modell</th>
                    <th className="py-2 pr-4 font-medium">Hersteller</th>
                    <th className="py-2 pr-4 font-medium">Baujahr</th>
                    <th className="py-2 pr-4 font-medium">OPDB-Ref</th>
                    <th className="py-2 font-medium">Generation</th>
                  </tr>
                </thead>
                <tbody>
                  {modelle.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-[var(--color-border)] align-middle hover:bg-[var(--color-surface-2)]"
                    >
                      <td className="py-2 pr-4 font-medium">{m.modell}</td>
                      <td className="py-2 pr-4 text-[var(--color-muted)]">
                        {m.hersteller}
                      </td>
                      <td className="py-2 pr-4">{m.baujahr ?? "—"}</td>
                      <td className="py-2 pr-4 font-mono text-xs text-[var(--color-faint)]">
                        {m.opdbRef}
                      </td>
                      <td className="py-2">
                        <ModelGenerationSelect
                          modelId={m.id}
                          generationen={genOptionen}
                          aktuell={m.generationId}
                          aktuellName={
                            genOptionen.find((g) => g.id === m.generationId)
                              ?.name ?? null
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
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
                title={modellName(m)}
                subtitle={
                  <>
                    {m.baujahr ?? "Baujahr unbekannt"}
                    <span className="font-mono text-xs"> · {m.opdbRef}</span>
                  </>
                }
                actions={
                  <ModelGenerationSelect
                    modelId={m.id}
                    generationen={genOptionen}
                    aktuell={m.generationId}
                    aktuellName={
                      genOptionen.find((g) => g.id === m.generationId)?.name ??
                      null
                    }
                  />
                }
              />
            ))}
          </List>
        )}

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
