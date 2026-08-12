import { count, eq, inArray } from "drizzle-orm";
import { ListChecks } from "lucide-react";
import { MachineTabs, type MachineTab } from "@/components/machine-tabs";
import { PlanItemCreate, PlanItemRow } from "@/components/plan-items";
import { Button } from "@/components/ui/button";
import { List } from "@/components/ui/list";
import { createStandard } from "@/db/actions/maintenance-plans";
import { db } from "@/db";
import { mindestens } from "@/lib/rechte";
import { machines, maintenancePlanItems, maintenancePlans } from "@/db/schema";
import { getUserClubs } from "@/db/queries";
import { requireUser } from "@/lib/session";

/*
  Standard-Wartungspläne verwalten: „Mein Standard" (privat) und die Standards
  der Clubs, die ich manage. Der Code-Katalog (lib/maintenance-catalog.ts) ist
  nur das Template für die Erstbefüllung — hier wird der eigene Standard
  gepflegt. Änderungen wirken sofort auf alle VERKNÜPFTEN Maschinen; Maschinen
  mit eigener Kopie bleiben unberührt.

  Die Pläne liegen hinter REITERN (?plan=<key>): sonst stapelten sich mehrere
  Standards mit je allen Punkten untereinander, und dass es überhaupt mehrere
  gibt, sah man erst nach langem Scrollen. Nur der aktive Plan wird gerendert.
*/
type PlanEintrag = {
  key: string;
  label: string;
  planId: string | null;
  manager: boolean;
  clubId: string | null;
};

export default async function WartungsplaenePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const me = await requireUser();
  const { plan: planParam } = await searchParams;

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

  const eintraege: PlanEintrag[] = [
    {
      key: "mein",
      label: "Mein Standard",
      planId: meinPlan?.id ?? null,
      manager: true,
      clubId: null,
    },
    ...clubPlaene.map(({ club, manager, plan }) => ({
      key: club.id,
      label: `Standard ${club.name}`,
      planId: plan?.id ?? null,
      manager,
      clubId: club.id,
    })),
  ];

  // Punktezahl je bestehendem Plan — für die Reiter-Badges (eine Abfrage).
  const planIds = eintraege
    .map((e) => e.planId)
    .filter((id): id is string => id !== null);
  const punkte = new Map<string, number>();
  if (planIds.length > 0) {
    const rows = await db
      .select({ planId: maintenancePlanItems.planId, n: count() })
      .from(maintenancePlanItems)
      .where(inArray(maintenancePlanItems.planId, planIds))
      .groupBy(maintenancePlanItems.planId);
    for (const r of rows) punkte.set(r.planId, Number(r.n));
  }

  const active = eintraege.some((e) => e.key === planParam)
    ? planParam!
    : "mein";
  const aktiv = eintraege.find((e) => e.key === active)!;

  // Nur der AKTIVE Plan wird voll geladen (Punkte + verknüpfte Maschinen).
  let aktivItems: (typeof maintenancePlanItems.$inferSelect)[] = [];
  let verknuepft = 0;
  if (aktiv.planId) {
    const [items, [{ n }]] = await Promise.all([
      db.query.maintenancePlanItems.findMany({
        where: eq(maintenancePlanItems.planId, aktiv.planId),
        orderBy: (t, { asc }) => [asc(t.titel)],
      }),
      db
        .select({ n: count() })
        .from(machines)
        .where(eq(machines.maintenancePlanId, aktiv.planId)),
    ]);
    aktivItems = items;
    verknuepft = n;
  }

  const tabs: MachineTab[] = eintraege.map((e) => ({
    key: e.key,
    label: e.label,
    href: `/wartungsplaene?plan=${e.key}`,
    active: e.key === active,
    badge: e.planId ? (
      <span className="rounded-full border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--color-muted)]">
        {punkte.get(e.planId) ?? 0}
      </span>
    ) : undefined,
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Wartungspläne</h1>
        <p className="text-[var(--color-muted)]">
          Standards als Vorlage: einmal gepflegt, auf beliebig vielen Maschinen
          verknüpft — Änderungen hier wirken sofort auf alle verknüpften
          Maschinen. Maschinen mit eigener Kopie bleiben unberührt.
        </p>
      </div>

      <MachineTabs primary={tabs} />

      <section className="space-y-3">
        {aktiv.planId ? (
          <>
            <p className="text-sm text-[var(--color-muted)]">
              {aktivItems.length} Punkte · {verknuepft} Maschine(n) verknüpft
              {aktiv.manager ? "" : " · nur lesend"}
            </p>
            <List empty="Noch keine Punkte — füge unten welche hinzu.">
              {aktivItems.map((i) => (
                <PlanItemRow key={i.id} item={i} schreibbar={aktiv.manager} />
              ))}
            </List>
            {aktiv.manager ? <PlanItemCreate planId={aktiv.planId} /> : null}
          </>
        ) : aktiv.manager ? (
          // Noch kein Plan — anlegen (privat oder Club-Standard).
          <form action={createStandard}>
            {aktiv.clubId ? (
              <input type="hidden" name="clubId" value={aktiv.clubId} />
            ) : null}
            <Button
              type="submit"
              variant={aktiv.clubId ? "secondary" : "primary"}
            >
              <ListChecks size={16} />
              {aktiv.clubId
                ? "Club-Standard anlegen (aus dem Template)"
                : "Meinen Standard anlegen (aus dem Template)"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">
            Noch kein Club-Standard — ein Club-Manager kann ihn anlegen.
          </p>
        )}
      </section>
    </div>
  );
}
