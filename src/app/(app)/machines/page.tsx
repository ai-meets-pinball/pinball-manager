import Link from "next/link";
import { LayoutGrid, Plus, Table2 } from "lucide-react";
import { MachinesBoard } from "@/components/machines-board";
import { SearchToolbar } from "@/components/ui/search-toolbar";
import {
  getDueMaintenanceCountByMachine,
  getUserClubs,
  getVisibleMachines,
} from "@/db/queries";
import { requireUser } from "@/lib/session";

/*
  Maschinenliste mit Tabs (Alle · Privat · je Club), Suche und zwei Ansichten
  (Karten / kompakte Tabelle). Zustand lebt in der URL: q (Suche), club
  ("privat" | Club-id | leer = alle), ansicht (karten | tabelle). Die Zähler in
  den Tabs beziehen sich auf das Suchergebnis (in-memory — die Liste ist klein).
*/
export default async function MachinesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; club?: string; ansicht?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = sp.q;
  const clubFilter = sp.club ?? "";
  const ansicht = sp.ansicht === "tabelle" ? ("tabelle" as const) : ("karten" as const);

  const machines = await getVisibleMachines(user.id, q);
  // Fällige Wartungen je Maschine — für die „N fällig"-Badge.
  const wartungFaellig = await getDueMaintenanceCountByMachine(
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

  const items =
    clubFilter === "privat"
      ? alle.filter((m) => m.clubId === null)
      : clubFilter
        ? alle.filter((m) => m.clubId === clubFilter)
        : alle;

  // URL-Helfer: Tabs erhalten q+ansicht, der Ansicht-Umschalter q+club.
  const href = (patch: { club?: string; ansicht?: string }) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    const c = patch.club ?? clubFilter;
    if (c) p.set("club", c);
    const a = patch.ansicht ?? ansicht;
    if (a === "tabelle") p.set("ansicht", "tabelle");
    const qs = p.toString();
    return `/machines${qs ? `?${qs}` : ""}`;
  };
  const ansichtStil = (aktiv: boolean) =>
    `rounded-[var(--radius)] border p-1.5 ${
      aktiv
        ? "border-[var(--color-primary)] text-[var(--color-primary)]"
        : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
    }`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Maschinen</h1>
        <Link
          href="/machines/new"
          className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-fg)] hover:opacity-90"
        >
          <Plus size={16} /> Neue Maschine
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Suche: GET-Formular aktualisiert die URL — Filterung server-seitig. */}
        <SearchToolbar
          placeholder="Hersteller oder Modell suchen…"
          defaultValue={q ?? ""}
          label="Maschinen suchen"
          keep={{
            ...(clubFilter ? { club: clubFilter } : {}),
            ...(ansicht === "tabelle" ? { ansicht } : {}),
          }}
          resetHref="/machines"
          aktiv={Boolean(q)}
        />
        <div className="flex items-center gap-1" aria-label="Ansicht">
          <Link
            href={href({ ansicht: "karten" })}
            aria-label="Kartenansicht"
            title="Kartenansicht"
            className={ansichtStil(ansicht === "karten")}
          >
            <LayoutGrid size={16} />
          </Link>
          <Link
            href={href({ ansicht: "tabelle" })}
            aria-label="Tabellenansicht"
            title="Tabellenansicht"
            className={ansichtStil(ansicht === "tabelle")}
          >
            <Table2 size={16} />
          </Link>
        </div>
      </div>

      {/* Tabs: Alle · Privat · je Club — nur zeigen, wenn es etwas zu filtern gibt. */}
      {tabs.length > 2 || tabs[1].count > 0 ? (
        <nav
          aria-label="Nach Club filtern"
          className="flex flex-wrap gap-1 border-b border-[var(--color-border)]"
        >
          {tabs.map((t) => {
            const aktiv = clubFilter === t.key;
            return (
              <Link
                key={t.key || "alle"}
                href={href({ club: t.key })}
                aria-current={aktiv ? "page" : undefined}
                className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                  aktiv
                    ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                }`}
              >
                {t.label}{" "}
                <span className="text-xs text-[var(--color-faint)]">
                  ({t.count})
                </span>
              </Link>
            );
          })}
        </nav>
      ) : null}

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
