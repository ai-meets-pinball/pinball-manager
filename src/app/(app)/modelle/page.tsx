import Link from "next/link";
import { cookies } from "next/headers";
import { PageHeader } from "@/components/ui/page-header";
import { BookOpen, LayoutGrid, Table2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CountPill } from "@/components/ui/count-pill";
import { RememberParams } from "@/components/remember-params";
import { SortKopf } from "@/components/ui/sort-kopf";
import { ViewToggle } from "@/components/ui/view-toggle";
import { getKnowledgeModels } from "@/db/queries";
import { requireUser } from "@/lib/session";
import { modellName } from "@/lib/format";
import { klebrig } from "@/lib/sticky-view";

/*
  Wissensbasis: alle Modelle, zu denen für diesen Nutzer Wissen sichtbar ist
  (Handbuch-Infos, Guides — dieselbe Sichtbarkeitsregel wie auf der
  Detailseite). Ein Modell (machine_models, z. B. „Monster Bash") ist die
  Klasse; einzelne Maschinen sind Instanzen — man muss den Automaten nicht
  selbst besitzen. Der Zähler meint WISSENSEINTRÄGE (nicht nur
  Handbuch-Extrakte); Reparatur-Freigaben ziehen in Phase 3 nach. Baugleiche
  Editionen (LE, Premium — gleiche ersten zwei OPDB-Segmente) erscheinen als
  EIN Eintrag mit „auch …", denn sie teilen ihr Wissen.
*/
export default async function WissensbasisPage({
  searchParams,
}: {
  searchParams: Promise<{ ansicht?: string; sort?: string; dir?: string }>;
}) {
  const currentUser = await requireUser();
  const modelle = await getKnowledgeModels(currentUser);

  /* Liste (voreingestellt) oder Karten mit Bild — gemerkt wie überall: URL
     gewinnt, sonst der Cookie. Eigener Cookie-Name, `modelleView` gehört dem
     Katalog unter /admin/modelle. */
  const sp = await searchParams;
  const cookieStore = await cookies();
  const ansicht = klebrig(
    sp.ansicht,
    cookieStore.get("wissenView")?.value,
    (v) => v === "karten" || v === "tabelle",
    "tabelle",
  ) as "karten" | "tabelle";
  const sort = klebrig(
    sp.sort,
    cookieStore.get("wissenSort")?.value,
    (v) => v === "name" || v === "jahr" || v === "generation",
    "name",
  ) as "name" | "jahr" | "generation";
  const dir = klebrig(
    sp.dir,
    cookieStore.get("wissenDir")?.value,
    (v) => v === "auf" || v === "ab",
    "auf",
  ) as "auf" | "ab";

  /* Sortierung in-memory: die Liste entsteht ohnehin erst nach dem
     Zusammenfassen der baugleichen Editionen, und sie ist kurz. Ohne Wert
     (Baujahr, Generation) fällt ein Eintrag ans Ende — unabhängig von der
     Richtung, wie auf der Maschinenliste. */
  const sortiert = [...modelle];
  const zuletzt = (a: unknown, b: unknown) =>
    a == null && b == null ? 0 : a == null ? 1 : b == null ? -1 : null;
  sortiert.sort((a, b) => {
    if (sort === "jahr") {
      const rand = zuletzt(a.baujahr, b.baujahr);
      if (rand !== null) return rand;
      return dir === "ab"
        ? b.baujahr! - a.baujahr!
        : a.baujahr! - b.baujahr!;
    }
    if (sort === "generation") {
      const rand = zuletzt(a.generation, b.generation);
      if (rand !== null) return rand;
      const v = a.generation!.localeCompare(b.generation!, "de");
      return dir === "ab" ? -v : v;
    }
    const v = modellName(a).localeCompare(modellName(b), "de");
    return dir === "ab" ? -v : v;
  });

  // Steuer-Links tragen immer alle gemerkten Parameter (siehe klebrig()).
  const href = (patch: { ansicht?: string; sort?: string; dir?: string }) =>
    `/modelle?${new URLSearchParams({
      ansicht: patch.ansicht ?? ansicht,
      sort: patch.sort ?? sort,
      dir: patch.dir ?? dir,
    }).toString()}`;
  const sortLink = (spalte: "name" | "jahr" | "generation") => ({
    aktiv: sort === spalte,
    href: href({
      sort: spalte,
      dir: sort === spalte ? (dir === "auf" ? "ab" : "auf") : "auf",
    }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wissensbasis"
        description="Geteiltes Wissen je Modell — Infos aus dem Handbuch, Guides und mehr. Einmal am Modell gepflegt, für alle Instanzen sichtbar; du musst den Automaten nicht selbst besitzen. Es erscheinen nur Modelle mit für dich sichtbarem Wissen."
        actions={
          modelle.length > 0 ? (
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
          ) : null
        }
      />
      <RememberParams
        path="/modelle"
        params={{ wissenView: ansicht, wissenSort: sort, wissenDir: dir }}
      />

      {modelle.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--color-muted)]">
            Aktuell ist dir gegenüber kein Wissen sichtbar. Sobald jemand etwas
            öffentlich (oder für deinen Club) freigibt, erscheint das passende
            Modell hier.
          </p>
        </Card>
      ) : ansicht === "tabelle" ? (
        /* Kompakte Tabelle — die Spaltenköpfe sortieren (wie /machines). */
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-[0.06em] text-[var(--color-muted)]">
                <SortKopf
                  label="Modell"
                  aktiv={sortLink("name").aktiv}
                  dir={dir}
                  href={sortLink("name").href}
                />
                <SortKopf
                  label="Baujahr"
                  aktiv={sortLink("jahr").aktiv}
                  dir={dir}
                  href={sortLink("jahr").href}
                />
                <SortKopf
                  label="Generation"
                  aktiv={sortLink("generation").aktiv}
                  dir={dir}
                  href={sortLink("generation").href}
                />
                <th className="py-2 font-medium">Wissen</th>
              </tr>
            </thead>
            <tbody>
              {sortiert.map((m) => (
                <tr
                  key={m.modelId}
                  className="border-b border-[var(--color-border)] align-middle hover:bg-[var(--color-surface-2)]"
                >
                  <td className="py-2 pr-4">
                    <Link
                      href={`/modelle/${m.modelId}`}
                      className="font-medium hover:underline"
                    >
                      {modellName(m)}
                    </Link>
                    {/* Baugleiche Editionen teilen diese Wissensbasis. */}
                    {m.editionen.length > 0 ? (
                      <span className="text-[var(--color-muted)]">
                        {" "}
                        · auch {m.editionen.join(", ")}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-4">{m.baujahr ?? "—"}</td>
                  <td className="py-2 pr-4 text-[var(--color-muted)]">
                    {m.generation ?? "—"}
                  </td>
                  <td className="py-2">
                    <CountPill n={m.eintraege} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sortiert.map((m) => (
            <Link
              key={m.modelId}
              href={`/modelle/${m.modelId}`}
              className="group"
            >
              <Card className="flex gap-3 overflow-hidden p-0 transition-colors group-hover:border-[var(--color-primary)]">
                {m.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.imageUrl}
                    alt=""
                    className="h-24 w-28 flex-none object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1 p-3">
                  <p className="truncate font-semibold">{modellName(m)}</p>
                  <p className="truncate text-sm text-[var(--color-muted)]">
                    {m.baujahr ?? "—"}
                    {m.generation ? ` · ${m.generation}` : ""}
                    {/* Baugleiche Editionen teilen diese Wissensbasis. */}
                    {m.editionen.length > 0 ? ` · auch ${m.editionen.join(", ")}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--color-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen size={13} /> {m.eintraege} Wissenseintr
                      {m.eintraege === 1 ? "ag" : "äge"}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
