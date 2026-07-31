import Link from "next/link";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getKnowledgeModels } from "@/db/queries";
import { requireUser } from "@/lib/session";
import { modellName } from "@/lib/format";

/*
  Modell-Katalog. Ein Modell (machine_models, z. B. „Monster Bash") ist die
  Klasse; einzelne Maschinen sind Instanzen. Handbuch-Wissen (`knowledge`) gehört
  zum TYP — hier sichtbar, ohne dass man den Automaten selbst besitzen muss. Es
  erscheinen nur Typen mit für den Nutzer sichtbarem Wissen (dieselbe
  Sichtbarkeitsregel wie auf der Detailseite). Reparaturen-Freigaben ziehen erst
  in Phase 3 nach; solange erscheinen reine „nur-Reparatur"-Typen hier noch nicht.
*/
export default async function GeraetetypenPage() {
  const currentUser = await requireUser();
  const modelle = await getKnowledgeModels(currentUser);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Modelle</h1>
        <p className="text-[var(--color-muted)]">
          Handbuch-Wissen je Automaten-Typ — einmal am Modell gepflegt, für alle
          Instanzen sichtbar. Du musst den Automaten nicht selbst besitzen; es
          erscheinen nur Typen mit für dich sichtbarem Wissen.
        </p>
      </div>

      {modelle.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--color-muted)]">
            Aktuell ist dir gegenüber kein Handbuch-Wissen sichtbar. Sobald jemand
            Handbuch-Daten öffentlich (oder für deinen Club) freigibt, erscheint
            der passende Modell hier.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {modelle.map((m) => (
            <Link key={m.modelId} href={`/typen/${m.modelId}`} className="group">
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
                  <p className="truncate font-semibold">
                    {modellName(m)}
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {m.baujahr ?? "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--color-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <FileText size={13} /> {m.eintraege} Handbuch-Eintrag
                      {m.eintraege === 1 ? "" : "e"}
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
