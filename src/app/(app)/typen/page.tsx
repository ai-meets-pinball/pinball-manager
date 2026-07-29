import Link from "next/link";
import { FileText, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getSharedModels } from "@/db/queries";
import { requireUser } from "@/lib/session";

/*
  Gerätetyp-Katalog. Ein Gerätetyp (machine_models, z. B. „Monster Bash") ist die
  Klasse; einzelne Maschinen sind Instanzen davon. Geteiltes Wissen gehört zum
  TYP — hier sichtbar, ohne dass man den Automaten selbst besitzen muss. Es
  erscheinen nur Typen mit für diesen Nutzer sichtbaren Freigaben (dieselbe
  Berechtigung wie auf der Maschinen-Detailseite).
*/
export default async function GeraetetypenPage() {
  const currentUser = await requireUser();
  const modelle = await getSharedModels(currentUser);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Gerätetypen</h1>
        <p className="text-[var(--color-muted)]">
          Geteiltes Wissen je Automaten-Typ — Handbuch-Daten und Reparaturen, die
          Besitzer desselben Geräts freigegeben haben. Du musst den Automaten
          nicht selbst besitzen.
        </p>
      </div>

      {modelle.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--color-muted)]">
            Aktuell ist nichts für dich freigegeben. Sobald jemand Handbuch-Daten
            oder Reparaturen eines Automaten teilt, erscheint der passende
            Gerätetyp hier.
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
                    {m.hersteller} {m.modell}
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {m.baujahr ?? "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--color-muted)]">
                    {m.faktenAnzahl > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <FileText size={13} /> Handbuch-Daten
                      </span>
                    ) : null}
                    {m.reparaturAnzahl > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Wrench size={13} /> {m.reparaturAnzahl} Reparatur
                        {m.reparaturAnzahl === 1 ? "" : "en"}
                      </span>
                    ) : null}
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
