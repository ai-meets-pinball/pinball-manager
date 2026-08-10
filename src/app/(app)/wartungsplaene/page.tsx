import { count, eq } from "drizzle-orm";
import { ListChecks } from "lucide-react";
import { PlanItemCreate, PlanItemRow } from "@/components/plan-items";
import { Button } from "@/components/ui/button";
import { List } from "@/components/ui/list";
import { createStandard } from "@/db/actions/maintenance-plans";
import { db } from "@/db";
import { mindestens } from "@/lib/rechte";
import {
  machines,
  maintenancePlanItems,
  maintenancePlans,
} from "@/db/schema";
import { getUserClubs } from "@/db/queries";
import { requireUser } from "@/lib/session";

/*
  Standard-Wartungspläne verwalten: „Mein Standard" (privat) und die Standards
  der Clubs, die ich manage. Der Code-Katalog (lib/maintenance-catalog.ts) ist
  nur das Template für die Erstbefüllung — hier wird der eigene Standard
  gepflegt. Änderungen wirken sofort auf alle VERKNÜPFTEN Maschinen; Maschinen
  mit eigener Kopie bleiben unberührt.
*/
export default async function WartungsplaenePage() {
  const me = await requireUser();

  const meinPlan = await db.query.maintenancePlans.findFirst({
    where: eq(maintenancePlans.userId, me.id),
  });

  // Clubs: Manager (owner/admin) dürfen den Club-Standard pflegen/anlegen;
  // Mitglieder sehen ihn nur (Verknüpfen passiert an der Maschine).
  const meineClubs = await getUserClubs(me.id);
  const clubPlaene = await Promise.all(
    meineClubs.map(async (c) => ({
      club: c,
      manager: mindestens(c.rolle, "admin"),
      plan: await db.query.maintenancePlans.findFirst({
        where: eq(maintenancePlans.clubId, c.id),
      }),
    })),
  );

  // Punkte + Anzahl verknüpfter Maschinen je Plan.
  const planDaten = async (planId: string) => {
    const [items, [{ verknuepft }]] = await Promise.all([
      db.query.maintenancePlanItems.findMany({
        where: eq(maintenancePlanItems.planId, planId),
        orderBy: (t, { asc }) => [asc(t.titel)],
      }),
      db
        .select({ verknuepft: count() })
        .from(machines)
        .where(eq(machines.maintenancePlanId, planId)),
    ]);
    return { items, verknuepft };
  };

  const mein = meinPlan ? await planDaten(meinPlan.id) : null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Wartungspläne</h1>
        <p className="text-[var(--color-muted)]">
          Standards als Vorlage: einmal gepflegt, auf beliebig vielen Maschinen
          verknüpft — Änderungen hier wirken sofort auf alle verknüpften
          Maschinen. Maschinen mit eigener Kopie bleiben unberührt.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center justify-between gap-3 text-lg font-semibold">
          <span>Mein Standard</span>
          {mein ? (
            <span className="text-sm font-normal text-[var(--color-muted)]">
              {mein.items.length} Punkte · {mein.verknuepft} Maschine(n) verknüpft
            </span>
          ) : null}
        </h2>
        {meinPlan && mein ? (
          <>
            <List empty="Noch keine Punkte — füge unten welche hinzu.">
              {mein.items.map((i) => (
                <PlanItemRow key={i.id} item={i} schreibbar />
              ))}
            </List>
            <PlanItemCreate planId={meinPlan.id} />
          </>
        ) : (
          <form action={createStandard}>
            <Button type="submit">
              <ListChecks size={16} /> Meinen Standard anlegen (aus dem Template)
            </Button>
          </form>
        )}
      </section>

      {clubPlaene.map(({ club, manager, plan }) => (
        <ClubStandard
          key={club.id}
          clubId={club.id}
          clubName={club.name}
          manager={manager}
          planId={plan?.id ?? null}
        />
      ))}
    </div>
  );
}

async function ClubStandard({
  clubId,
  clubName,
  manager,
  planId,
}: {
  clubId: string;
  clubName: string;
  manager: boolean;
  planId: string | null;
}) {
  if (!planId) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Standard {clubName}</h2>
        {manager ? (
          <form action={createStandard}>
            <input type="hidden" name="clubId" value={clubId} />
            <Button type="submit" variant="secondary">
              <ListChecks size={16} /> Club-Standard anlegen (aus dem Template)
            </Button>
          </form>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">
            Noch kein Club-Standard — ein Club-Manager kann ihn anlegen.
          </p>
        )}
      </section>
    );
  }

  const [items, [{ verknuepft }]] = await Promise.all([
    db.query.maintenancePlanItems.findMany({
      where: eq(maintenancePlanItems.planId, planId),
      orderBy: (t, { asc }) => [asc(t.titel)],
    }),
    db
      .select({ verknuepft: count() })
      .from(machines)
      .where(eq(machines.maintenancePlanId, planId)),
  ]);

  return (
    <section className="space-y-3">
      <h2 className="flex items-center justify-between gap-3 text-lg font-semibold">
        <span>Standard {clubName}</span>
        <span className="text-sm font-normal text-[var(--color-muted)]">
          {items.length} Punkte · {verknuepft} Maschine(n) verknüpft
          {manager ? "" : " · nur lesend"}
        </span>
      </h2>
      <List empty="Noch keine Punkte.">
        {items.map((i) => (
          <PlanItemRow key={i.id} item={i} schreibbar={manager} />
        ))}
      </List>
      {manager ? <PlanItemCreate planId={planId} /> : null}
    </section>
  );
}
