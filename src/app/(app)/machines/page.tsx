import { CheckSquare, LayoutGrid, Plus, Table2 } from "lucide-react";
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
import { bereichKeys } from "@/lib/bereich";
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
    bereich?: string;
    club?: string;
    sort?: string;
    dir?: string;
    ansicht?: string;
    verwalten?: string;
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
    "tabelle",
  ) as "karten" | "tabelle";
  /* Sammelaktionen (mehrere zuweisen/löschen) laufen als eigener Modus, der in
     der URL steht — so kann der Schalter dafür hier oben in der Steuerzeile
     sitzen, während die Auswahl selbst in der Tabelle passiert. Bewusst NICHT
     gemerkt: ein Verwaltungsmodus soll nicht beim nächsten Besuch anspringen. */
  const verwalten = sp.verwalten === "1";

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
    createdAt: m.createdAt,
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

  /* Bereichs-Auswahl wie auf dem Dashboard: MEHRERE Bereiche gleichzeitig,
     leer = alle (deshalb kein eigener Chip „Alle" mehr). Gemerkt wird sie im
     app-weiten Cookie `bereich`, damit dieselbe Wahl auf beiden Seiten gilt.
     `?club=` bleibt lesbar — alte Links und Lesezeichen sollen weiter gehen;
     ein veralteter Wert (verlassener Club) fällt auf „alle" zurück. */
  const bereichKey = (clubId: string | null) => clubId ?? "privat";
  const tabs = [
    ...(alle.some((m) => m.clubId === null)
      ? [
          {
            key: "privat",
            label: "Privat",
            count: alle.filter((m) => m.clubId === null).length,
          },
        ]
      : []),
    ...[...clubTabs].map(([id, name]) => ({
      key: id,
      label: name,
      count: alle.filter((m) => m.clubId === id).length,
    })),
  ];
  const gueltigeBereiche = new Set(tabs.map((t) => t.key));
  const bereichRoh =
    sp.bereich !== undefined
      ? sp.bereich
      : sp.club !== undefined
        ? sp.club === "alle"
          ? ""
          : sp.club
        : cookieStore.get("bereich")?.value;
  const gewaehlt = bereichKeys(bereichRoh, gueltigeBereiche);
  const aktiv = new Set(gewaehlt.length ? gewaehlt : tabs.map((t) => t.key));

  const gefiltert = alle.filter((m) => aktiv.has(bereichKey(m.clubId)));

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
    bereich?: string[];
    ansicht?: string;
    sort?: string;
    dir?: string;
    verwalten?: boolean;
  }) => {
    const p = new URLSearchParams();
    // Steuer-Links tragen IMMER alle gemerkten Parameter (auch Defaults), damit
    // jeder Wert wieder wählbar ist; weggelassene fallen serverseitig auf den
    // gemerkten Cookie-Wert zurück (siehe klebrig()).
    if (q) p.set("q", q);
    // "" = alle Bereiche; eine volle Auswahl ist dasselbe wie keine.
    const bereiche = patch.bereich ?? gewaehlt;
    p.set(
      "bereich",
      bereiche.length && bereiche.length < tabs.length
        ? tabs
            .map((t) => t.key)
            .filter((k) => bereiche.includes(k))
            .join(",")
        : "",
    );
    p.set("sort", patch.sort ?? sort);
    p.set("dir", patch.dir ?? dir);
    p.set("ansicht", patch.ansicht ?? ansicht);
    if (patch.verwalten ?? verwalten) p.set("verwalten", "1");
    return `/machines?${p.toString()}`;
  };

  // Bereich-Toggle: schaltet EINEN Bereich in der Auswahl an/aus.
  const toggleHref = (key: string) => {
    const cur = new Set(gewaehlt.length ? gewaehlt : tabs.map((t) => t.key));
    if (cur.has(key)) cur.delete(key);
    else cur.add(key);
    return href({ bereich: tabs.map((t) => t.key).filter((k) => cur.has(k)) });
  };

  /* Ziele für die sortierbaren Tabellenköpfe: eine inaktive Spalte übernimmt
     die Sortierung (aufsteigend), die aktive dreht nur die Richtung. */
  const sortLink = (spalte: "neu" | "name" | "jahr") => ({
    aktiv: sort === spalte,
    href: href({
      sort: spalte,
      dir: sort === spalte ? (dir === "auf" ? "ab" : "auf") : "auf",
    }),
  });
  const sortLinks = {
    neu: sortLink("neu"),
    name: sortLink("name"),
    jahr: sortLink("jahr"),
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
          keep={{ bereich: gewaehlt.join(","), dir, ansicht }}
          resetHref="/machines"
          aktiv={Boolean(q)}
          ohneButton
          breite="w-44 sm:w-56"
        >
          {/* Nur in der Kartenansicht: dort gibt es keinen Tabellenkopf zum
              Klicken. In der Tabelle sortieren die Spaltenköpfe (SortKopf) —
              das hält die Steuerzeile auf dem Desktop einzeilig. */}
          {ansicht === "karten" ? (
            <>
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
            </>
          ) : null}
        </SearchToolbar>
        {/* Bereichs-Filter: Alle · Privat · je Club (nur, wenn es etwas zu filtern gibt). */}
        {tabs.length > 1 ? (
          <ChipFilter
            ariaLabel="Nach Bereich filtern"
            options={tabs.map((t) => ({
              key: t.key,
              label: t.label,
              count: t.count,
              href: toggleHref(t.key),
              aktiv: aktiv.has(t.key),
            }))}
          />
        ) : null}
        {/* Sammelaktionen: EIN Einstieg statt zweier Text-Links unter der
            Steuerzeile. Führt in den Auswahlmodus; die Aktionen (zuweisen,
            löschen) stehen danach in der Leiste über der Liste. */}
        <div className="ml-auto flex items-center gap-2">
          {/* Nur der EINSTIEG steht hier. Im Verwalten-Modus führt die
              Sammel-Leiste über der Liste wieder heraus („Fertig") — zwei
              Ausstiege mit derselben Beschriftung wären Doppelanzeige. */}
          {items.length > 0 && !verwalten ? (
            <ButtonLink
              href={href({ verwalten: true })}
              variant="secondary"
              size="sm"
            >
              <CheckSquare size={14} /> Verwalten
            </ButtonLink>
          ) : null}
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
      {/* `bereich` gilt app-weit (Default-path "/"), damit die Wahl auch auf
          dem Dashboard gilt; Sortierung und Ansicht bleiben seitenspezifisch. */}
      <RememberParams params={{ bereich: gewaehlt.join(",") }} />
      <RememberParams
        path="/machines"
        params={{
          machinesSort: sort,
          machinesDir: dir,
          machinesView: ansicht,
        }}
      />

      {items.length === 0 ? (
        <p className="text-[var(--color-muted)]">
          {q || gewaehlt.length
            ? "Keine Maschinen gefunden."
            : "Noch keine Maschinen. Lege deine erste an."}
        </p>
      ) : (
        <MachinesBoard
          machines={items}
          clubs={meineClubs.map((c) => ({ id: c.id, name: c.name }))}
          ansicht={ansicht}
          sortLinks={sortLinks}
          dir={dir}
          verwalten={verwalten}
          beendenHref={href({ verwalten: false })}
        />
      )}
    </div>
  );
}
