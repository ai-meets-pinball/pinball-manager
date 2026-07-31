import { and, asc, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import Link from "next/link";
import { ModelGenerationSelect } from "@/components/model-generation-select";
import { Select } from "@/components/ui/input";
import { List, ListRow } from "@/components/ui/list";
import { Pagination } from "@/components/ui/pagination";
import { SearchToolbar } from "@/components/ui/search-toolbar";
import { db } from "@/db";
import { generations, machineModels } from "@/db/schema";

/*
  Modelle (Super-Admin): der Gerätetyp-Katalog — durchsuchbar (Text), filterbar
  (Generation) und sortierbar (Name/Baujahr). Die Zuordnung Modell → Generation
  passiert hier per Stift; die Generationen selbst werden auf
  /admin/generationen gepflegt. Kennzahlen zählen serverseitig über den GANZEN
  Bestand. Der Super-Admin-Guard sitzt im admin/layout.tsx.

  Query-Parameter (deutsche Konvention): q (Suche), gen (Generation-id | "ohne"),
  sort (name | jahr), dir (auf | ab), seite.
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
    seite?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const gen = sp.gen ?? "";
  const sort = sp.sort === "jahr" ? "jahr" : "name";
  const dir = sp.dir === "ab" ? "ab" : "auf";
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

  // Sortierung: Name (Hersteller, Modell) oder Baujahr — NULLS LAST, damit
  // Modelle ohne Jahr in beiden Richtungen ans Ende fallen.
  const sortierung =
    sort === "jahr"
      ? dir === "ab"
        ? [sql`${machineModels.baujahr} DESC NULLS LAST`]
        : [sql`${machineModels.baujahr} ASC NULLS LAST`]
      : dir === "ab"
        ? [desc(machineModels.hersteller), desc(machineModels.modell)]
        : [asc(machineModels.hersteller), asc(machineModels.modell)];

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
  };

  /* Sortier-Link: Klick auf die aktive Spalte dreht die Richtung um; sonst
     Spalte wechseln (aufsteigend). Seite fällt dabei bewusst auf 1 zurück. */
  const sortHref = (key: "name" | "jahr") => {
    const p = new URLSearchParams({
      ...(q ? { q } : {}),
      ...(gen ? { gen } : {}),
    });
    if (key !== "name") p.set("sort", key);
    if (sort === key && dir === "auf") p.set("dir", "ab");
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
        Der Gerätetyp-Katalog. {gesamt} Modelle ·{" "}
        <Link href="/admin/modelle?gen=ohne" className="hover:underline">
          {ohneGen} ohne Generation
        </Link>
        .
      </p>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Modelle ({treffer})</h2>
          <SearchToolbar
            placeholder="Hersteller, Modell oder OPDB-Ref …"
            defaultValue={q}
            label="Modelle suchen"
            keep={{
              ...(sort !== "name" ? { sort } : {}),
              ...(dir !== "auf" ? { dir } : {}),
            }}
            resetHref="/admin/modelle"
            aktiv={Boolean(q || gen)}
          >
            <Select
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
            </Select>
          </SearchToolbar>
        </div>

        <p className="text-sm">
          <span className="text-[var(--color-muted)]">Sortieren: </span>
          {sortLabel("name", "Name")}
          <span className="text-[var(--color-faint)]"> · </span>
          {sortLabel("jahr", "Baujahr")}
        </p>

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
                <>
                  {m.baujahr ?? "Baujahr unbekannt"}
                  <span className="font-mono text-xs">
                    {" "}
                    · {m.opdbRef}
                  </span>
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
