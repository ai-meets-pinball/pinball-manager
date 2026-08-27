import Link from "next/link";
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
import { requireUser } from "@/lib/session";

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
  const clubFilter = sp.club ?? "";
  const sort = sp.sort === "name" || sp.sort === "jahr" ? sp.sort : "neu";
  const dir = sp.dir === "ab" ? ("ab" as const) : ("auf" as const);
  const ansicht =
    sp.ansicht === "tabelle" ? ("tabelle" as const) : ("karten" as const);

  const machines = await getMeineMaschinen(user, q);
  // Fällige Wartungen je Maschine — für die „N fällig"-Badge.
  const wartungFaellig = await getDueMaintenanceCountByMachine(
    user,
    machines.map((m) => m.id),
  );
  // Clubs des Nutzers — Tabs + Ziele für die Bulk-Zuweisung.
  const meineClubs = await getUserClubs(user.id);

  const alle = machines.map((m) => ({
    id: m.id,
    hersteller: m.hersteller,
    modell: m.modell,
    baujahr: m.baujahr,
    fotoUrl: m.fotoUrl,
    clubId: m.clubId,
    club: m.club,
    wartungFaellig: wartungFaellig.get(m.id) ?? 0,
  }));

  // Tabs: Alle · Privat · je Club (eigene Clubs + Clubs, in denen sichtbare
  // Maschinen hängen — deckt auch eigene Maschinen in verlassenen Clubs ab).
  const clubTabs = new Map(meineClubs.map((c) => [c.id, c.name]));
  for (const m of alle) {
    if (m.clubId && m.club?.name && !clubTabs.has(m.clubId)) {
      clubTabs.set(m.clubId, m.club.name);
    }
  }
  const tabs = [
    { key: "", label: "Alle", count: alle.length },
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
    if (q) p.set("q", q);
    const c = patch.club ?? clubFilter;
    if (c) p.set("club", c);
    const s = patch.sort ?? sort;
    if (s !== "neu") p.set("sort", s);
    const d = patch.dir ?? dir;
    if (d !== "auf") p.set("dir", d);
    const a = patch.ansicht ?? ansicht;
    if (a === "tabelle") p.set("ansicht", "tabelle");
    const qs = p.toString();
    return `/machines${qs ? `?${qs}` : ""}`;
  };

  /* Sortier-Link: Klick auf die aktive Spalte dreht die Richtung um. */
  const sortLabel = (key: "neu" | "name" | "jahr", label: string) => (
    <Link
      href={href({
        sort: key,
        dir: sort === key && dir === "auf" ? "ab" : "auf",
      })}
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
      <PageHeader
        title="Maschinen"
        actions={
          <ButtonLink href="/machines/new">
            <Plus size={16} /> Neue Maschine
          </ButtonLink>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Suche: GET-Formular aktualisiert die URL — Filterung server-seitig. */}
        <SearchToolbar
          placeholder="Hersteller oder Modell suchen…"
          defaultValue={q ?? ""}
          label="Maschinen suchen"
          keep={{
            ...(clubFilter ? { club: clubFilter } : {}),
            ...(sort !== "neu" ? { sort } : {}),
            ...(dir !== "auf" ? { dir } : {}),
            ...(ansicht === "tabelle" ? { ansicht } : {}),
          }}
          resetHref="/machines"
          aktiv={Boolean(q)}
        />
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

      {/* Bereichs-Filter: Alle · Privat · je Club — dieselbe Chip-Komponente
          wie in der Übersicht (nur zeigen, wenn es etwas zu filtern gibt). */}
      {tabs.length > 2 || tabs[1].count > 0 ? (
        <ChipFilter
          ariaLabel="Nach Club filtern"
          options={tabs.map((t) => ({
            key: t.key,
            label: t.label,
            count: t.count,
            href: href({ club: t.key }),
            aktiv: clubFilter === t.key,
          }))}
        />
      ) : null}

      <p className="text-sm">
        <span className="text-[var(--color-muted)]">Sortieren: </span>
        {sortLabel("neu", "Neueste")}
        <span className="text-[var(--color-faint)]"> · </span>
        {sortLabel("name", "Name")}
        <span className="text-[var(--color-faint)]"> · </span>
        {sortLabel("jahr", "Baujahr")}
      </p>

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
