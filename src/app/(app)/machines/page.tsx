import { LayoutGrid, Plus, Table2 } from "lucide-react";
import { MachinesBoard } from "@/components/machines-board";
import { ButtonLink } from "@/components/ui/button";
import { ChipFilter } from "@/components/ui/chip-filter";
import { PageHeader } from "@/components/ui/page-header";
import { SearchToolbar } from "@/components/ui/search-toolbar";
import { ViewToggle } from "@/components/ui/view-toggle";
import {
  getDueMaintenanceCountByMachine,
  getUserClubs,
  getMeineMaschinen,
} from "@/db/queries";
import { cookies } from "next/headers";
import { RememberParams } from "@/components/remember-params";
import { requireUser } from "@/lib/session";
import { klebrig } from "@/lib/sticky-view";
import { darfMaschine } from "@/lib/rechte";
import { AutoSubmitSelect } from "@/components/ui/auto-submit-select";
import { SortRichtung } from "@/components/ui/sort-richtung";

/*
  Maschinenliste mit Tabs (Alle · Privat · je Club), Suche, Sortierung und zwei
  Ansichten (Karten / kompakte Tabelle). Zustand lebt in der URL: q (Suche),
  club ("privat" | Club-id | leer = alle), sort (neu | name | jahr), dir
  (auf | ab), ansicht (karten | tabelle). Filter/Sortierung laufen in-memory —
  die Liste eines Nutzers ist klein.
*/
export default async function MachinesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    club?: string;
    sort?: string;
    dir?: string;
    ansicht?: string;
  }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = sp.q;
  const cookieStore = await cookies();
  const sort = klebrig(
    sp.sort,
    cookieStore.get("machinesSort")?.value,
    (v) => v === "neu" || v === "name" || v === "jahr",
    "neu",
  ) as "neu" | "name" | "jahr";
  const dir = klebrig(
    sp.dir,
    cookieStore.get("machinesDir")?.value,
    (v) => v === "auf" || v === "ab",
    "auf",
  ) as "auf" | "ab";
  const ansicht = klebrig(
    sp.ansicht,
    cookieStore.get("machinesView")?.value,
    (v) => v === "karten" || v === "tabelle",
    "karten",
  ) as "karten" | "tabelle";

  const machines = await getMeineMaschinen(user, q);
  // Fällige Wartungen je Maschine — für die „N fällig"-Badge.
  const wartungFaellig = await getDueMaintenanceCountByMachine(
    user,
    machines.map((m) => m.id),
  );
  // Clubs des Nutzers — Tabs + Ziele für die Bulk-Zuweisung.
  const meineClubs = await getUserClubs(user.id);

  // Umhängen/Löschen im Sammelmodus: dieselbe Regel wie die Actions
  // (darfMaschine().loeschen) — damit sich nur anhaken lässt, was auch geht.
  const meineRollen = new Map(meineClubs.map((c) => [c.id, c.rolle]));
  const alle = machines.map((m) => ({
    id: m.id,
    hersteller: m.hersteller,
    modell: m.modell,
    baujahr: m.baujahr,
    fotoUrl: m.fotoUrl,
    clubId: m.clubId,
    club: m.club,
    wartungFaellig: wartungFaellig.get(m.id) ?? 0,
    darfUmhaengen: darfMaschine(
      user,
      { ownerId: m.ownerId, clubId: m.clubId },
      m.clubId ? (meineRollen.get(m.clubId) ?? null) : null,
    ).loeschen,
  }));

  // Tabs: Alle · Privat · je Club (eigene Clubs + Clubs, in denen sichtbare
  // Maschinen hängen — deckt auch eigene Maschinen in verlassenen Clubs ab).
  const clubTabs = new Map(meineClubs.map((c) => [c.id, c.name]));
  for (const m of alle) {
    if (m.clubId && m.club?.name && !clubTabs.has(m.clubId)) {
      clubTabs.set(m.clubId, m.club.name);
    }
  }

  /* Bereichs-Auswahl merken: die URL (?club=) gewinnt, sonst das zuletzt in
     einem Cookie gemerkte (überlebt Navigation UND Sessions). „alle" ist ein
     expliziter Wert, damit man bewusst dorthin zurück kann. Ein ungültiger/
     veralteter Wert (gelöschter Club) fällt auf „alle" zurück. */
  const gueltigeBereiche = new Set<string>([
    "alle",
    "privat",
    ...clubTabs.keys(),
  ]);
  const rawClub = klebrig(
    sp.club,
    cookieStore.get("machinesScope")?.value,
    (v) => gueltigeBereiche.has(v),
    "alle",
  );
  const clubFilter = rawClub === "alle" ? "" : rawClub;

  const tabs = [
    { key: "alle", label: "Alle", count: alle.length },
    {
      key: "privat",
      label: "Privat",
      count: alle.filter((m) => m.clubId === null).length,
    },
    ...[...clubTabs].map(([id, name]) => ({
      key: id,
      label: name,
      count: alle.filter((m) => m.clubId === id).length,
    })),
  ];

  const gefiltert =
    clubFilter === "privat"
      ? alle.filter((m) => m.clubId === null)
      : clubFilter
        ? alle.filter((m) => m.clubId === clubFilter)
        : alle;

  /* Sortierung in-memory. "neu" = Reihenfolge der Query (neueste zuerst; „ab"
     dreht auf älteste zuerst). Baujahr ohne Wert fällt ans Ende. */
  const items = [...gefiltert];
  if (sort === "name") {
    items.sort(
      (a, b) =>
        a.modell.localeCompare(b.modell, "de") ||
        a.hersteller.localeCompare(b.hersteller, "de"),
    );
    if (dir === "ab") items.reverse();
  } else if (sort === "jahr") {
    items.sort((a, b) => {
      if (a.baujahr == null && b.baujahr == null) return 0;
      if (a.baujahr == null) return 1; // nulls last, unabhängig von der Richtung
      if (b.baujahr == null) return -1;
      return dir === "ab" ? b.baujahr - a.baujahr : a.baujahr - b.baujahr;
    });
  } else if (dir === "ab") {
    items.reverse(); // "neu" umgedreht = älteste zuerst
  }

  // URL-Helfer: jede Änderung erhält die übrigen Parameter.
  const href = (patch: {
    club?: string;
    ansicht?: string;
    sort?: string;
    dir?: string;
  }) => {
    const p = new URLSearchParams();
    // Steuer-Links tragen IMMER alle gemerkten Parameter (auch Defaults), damit
    // jeder Wert wieder wählbar ist; weggelassene fallen serverseitig auf den
    // gemerkten Cookie-Wert zurück (siehe klebrig()).
    if (q) p.set("q", q);
    p.set("club", patch.club ?? rawClub);
    p.set("sort", patch.sort ?? sort);
    p.set("dir", patch.dir ?? dir);
    p.set("ansicht", patch.ansicht ?? ansicht);
    return `/machines?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maschinen"
        actions={
          <ButtonLink href="/machines/new">
            <Plus size={16} /> Neue Maschine
          </ButtonLink>
        }
      />

      {/* EINE Steuerzeile: Suche + Sortierung (Select, speichert beim Ändern,
          Pfeil dreht die Richtung) + Bereichs-Chips, rechts die Ansicht. */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchToolbar
          placeholder="Suchen…"
          defaultValue={q ?? ""}
          label="Maschinen suchen"
          keep={{ club: rawClub, dir, ansicht }}
          resetHref="/machines"
          aktiv={Boolean(q)}
          ohneButton
          breite="w-44 sm:w-56"
        >
          <AutoSubmitSelect
            name="sort"
            defaultValue={sort}
            aria-label="Sortieren"
            className="w-auto"
          >
            <option value="neu">Neueste</option>
            <option value="name">Name</option>
            <option value="jahr">Baujahr</option>
          </AutoSubmitSelect>
          <SortRichtung
            dir={dir}
            href={href({ dir: dir === "auf" ? "ab" : "auf" })}
          />
        </SearchToolbar>
        {/* Bereichs-Filter: Alle · Privat · je Club (nur, wenn es etwas zu filtern gibt). */}
        {tabs.length > 2 || tabs[1].count > 0 ? (
          <ChipFilter
            ariaLabel="Nach Club filtern"
            options={tabs.map((t) => ({
              key: t.key,
              label: t.label,
              count: t.count,
              href: href({ club: t.key }),
              aktiv: rawClub === t.key,
            }))}
          />
        ) : null}
        <div className="ml-auto">
          <ViewToggle
            options={[
              {
                href: href({ ansicht: "karten" }),
                label: "Kartenansicht",
                icon: <LayoutGrid size={16} />,
                active: ansicht === "karten",
              },
              {
                href: href({ ansicht: "tabelle" }),
                label: "Tabellenansicht",
                icon: <Table2 size={16} />,
                active: ansicht === "tabelle",
              },
            ]}
          />
        </div>
      </div>
      <RememberParams
        path="/machines"
        params={{
          machinesScope: rawClub,
          machinesSort: sort,
          machinesDir: dir,
          machinesView: ansicht,
        }}
      />

      {items.length === 0 ? (
        <p className="text-[var(--color-muted)]">
          {q || clubFilter
            ? "Keine Maschinen gefunden."
            : "Noch keine Maschinen. Lege deine erste an."}
        </p>
      ) : (
        <MachinesBoard
          machines={items}
          clubs={meineClubs.map((c) => ({ id: c.id, name: c.name }))}
          ansicht={ansicht}
        />
      )}
    </div>
  );
}
