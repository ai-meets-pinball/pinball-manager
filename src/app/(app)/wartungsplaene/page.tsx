import { count, eq, inArray } from "drizzle-orm";
import { PageHeader } from "@/components/ui/page-header";
import { MachineTabs, type MachineTab } from "@/components/machine-tabs";
import { PlanCreate } from "@/components/plan-create";
import { PlanHeader } from "@/components/plan-header";
import { PlanItemCreate, PlanItemRow } from "@/components/plan-items";
import { List } from "@/components/ui/list";
import { db } from "@/db";
import { mindestens } from "@/lib/rechte";
import { machines, maintenancePlanItems } from "@/db/schema";
import { getClubPlans, getUserClubs, getUserPlans } from "@/db/queries";
import { requireUser } from "@/lib/session";

/*
  Wartungspläne verwalten: MEHRERE benannte Pläne je Nutzer („Mein Plan") und je
  Club, den ich manage. Der Code-Katalog (lib/maintenance-catalog.ts) ist nur
  eine optionale Vorlage. Änderungen an einem Plan wirken sofort auf alle damit
  VERKNÜPFTEN Maschinen; Maschinen mit eigener Kopie bleiben unberührt.

  Die Pläne liegen hinter REITERN (?plan=<planId>) — nur der aktive wird geladen.
*/
type PlanEintrag = {
  planId: string;
  label: string;
  ownerLabel: string;
  manager: boolean;
};

export default async function WartungsplaenePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const me = await requireUser();
  const { plan: planParam } = await searchParams;

  const meineClubs = await getUserClubs(me.id);

  const eintraege: PlanEintrag[] = [
    ...(await getUserPlans(me.id)).map((p) => ({
      planId: p.id,
      label: p.name,
      ownerLabel: "Mein Plan",
      manager: true,
    })),
    ...(
      await Promise.all(
        meineClubs.map(async (c) => {
          const manager = mindestens(c.rolle, "admin");
          return (await getClubPlans(c.id)).map((p) => ({
            planId: p.id,
            label: p.name,
            ownerLabel: `Standard ${c.name}`,
            manager,
          }));
        }),
      )
    ).flat(),
  ];

  // Punktezahl je Plan — für die Reiter-Badges (eine Abfrage).
  const planIds = eintraege.map((e) => e.planId);
  const punkte = new Map<string, number>();
  if (planIds.length > 0) {
    const rows = await db
      .select({ planId: maintenancePlanItems.planId, n: count() })
      .from(maintenancePlanItems)
      .where(inArray(maintenancePlanItems.planId, planIds))
      .groupBy(maintenancePlanItems.planId);
    for (const r of rows) punkte.set(r.planId, Number(r.n));
  }

  const aktiv =
    eintraege.find((e) => e.planId === planParam) ?? eintraege[0] ?? null;

  // Nur der AKTIVE Plan wird voll geladen (Punkte + verknüpfte Maschinen).
  let aktivItems: (typeof maintenancePlanItems.$inferSelect)[] = [];
  let verknuepft = 0;
  if (aktiv) {
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
    key: e.planId,
    label: e.label,
    href: `/wartungsplaene?plan=${e.planId}`,
    active: aktiv?.planId === e.planId,
    badge: (
      <span className="rounded-full border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--color-muted)]">
        {punkte.get(e.planId) ?? 0}
      </span>
    ),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wartungspläne"
        description="Benannte Standards als Vorlage — beliebig viele je Nutzer bzw. Club. Einmal gepflegt, auf beliebig vielen Maschinen verknüpft; Änderungen hier wirken sofort auf alle verknüpften Maschinen. Maschinen mit eigener Kopie bleiben unberührt."
      />

      <PlanCreate
        clubs={meineClubs
          .filter((c) => mindestens(c.rolle, "admin"))
          .map((c) => ({ id: c.id, name: c.name }))}
      />

      {eintraege.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          Noch keine Pläne — leg oben einen an.
        </p>
      ) : (
        <>
          <MachineTabs primary={tabs} />
          {aktiv ? (
            <section className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-faint)]">
                  {aktiv.ownerLabel}
                </span>
                <span className="text-sm text-[var(--color-muted)]">
                  {aktivItems.length} Punkte · {verknuepft} Maschine(n) verknüpft
                  {aktiv.manager ? "" : " · nur lesend"}
                </span>
              </div>

              {aktiv.manager ? (
                <PlanHeader planId={aktiv.planId} name={aktiv.label} />
              ) : null}

              <List empty="Noch keine Punkte — füge unten welche hinzu.">
                {aktivItems.map((i) => (
                  <PlanItemRow key={i.id} item={i} schreibbar={aktiv.manager} />
                ))}
              </List>

              {aktiv.manager ? <PlanItemCreate planId={aktiv.planId} /> : null}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
