import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getKnowledgeModels } from "@/db/queries";
import { requireUser } from "@/lib/session";
import { modellName } from "@/lib/format";

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
export default async function WissensbasisPage() {
  const currentUser = await requireUser();
  const modelle = await getKnowledgeModels(currentUser);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wissensbasis"
        description="Geteiltes Wissen je Modell — Infos aus dem Handbuch, Guides und mehr. Einmal am Modell gepflegt, für alle Instanzen sichtbar; du musst den Automaten nicht selbst besitzen. Es erscheinen nur Modelle mit für dich sichtbarem Wissen."
      />

      {modelle.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--color-muted)]">
            Aktuell ist dir gegenüber kein Wissen sichtbar. Sobald jemand etwas
            öffentlich (oder für deinen Club) freigibt, erscheint das passende
            Modell hier.
          </p>
        </Card>
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
