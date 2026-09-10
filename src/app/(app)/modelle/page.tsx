import Link from "next/link";
import { cookies } from "next/headers";
import { PageHeader } from "@/components/ui/page-header";
import { BookOpen, LayoutGrid, List as ListIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CountPill } from "@/components/ui/count-pill";
import { List, ListRow } from "@/components/ui/list";
import { RememberParams } from "@/components/remember-params";
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
  searchParams: Promise<{ ansicht?: string }>;
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
    (v) => v === "karten" || v === "liste",
    "liste",
  ) as "karten" | "liste";
  const ansichtHref = (a: "karten" | "liste") => `/modelle?ansicht=${a}`;

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
                  href: ansichtHref("karten"),
                  label: "Kartenansicht",
                  icon: <LayoutGrid size={16} />,
                  active: ansicht === "karten",
                },
                {
                  href: ansichtHref("liste"),
                  label: "Listenansicht",
                  icon: <ListIcon size={16} />,
                  active: ansicht === "liste",
                },
              ]}
            />
          ) : null
        }
      />
      <RememberParams path="/modelle" params={{ wissenView: ansicht }} />

      {modelle.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--color-muted)]">
            Aktuell ist dir gegenüber kein Wissen sichtbar. Sobald jemand etwas
            öffentlich (oder für deinen Club) freigibt, erscheint das passende
            Modell hier.
          </p>
        </Card>
      ) : ansicht === "liste" ? (
        /* Kompakte Liste — eine Zeile je Modell, wie auf den übrigen Seiten. */
        <List empty="Keine Modelle." kompakt>
          {modelle.map((m) => (
            <ListRow
              key={m.modelId}
              kompakt
              href={`/modelle/${m.modelId}`}
              title={modellName(m)}
              subtitle={`${m.baujahr ?? "—"}${
                m.editionen.length > 0 ? ` · auch ${m.editionen.join(", ")}` : ""
              }`}
              meta={
                <CountPill
                  n={`${m.eintraege} Wissenseintr${m.eintraege === 1 ? "ag" : "äge"}`}
                />
              }
            />
          ))}
        </List>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {modelle.map((m) => (
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
