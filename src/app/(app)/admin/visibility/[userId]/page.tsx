import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { List, ListRow } from "@/components/ui/list";
import { StatusBadge } from "@/components/ui/status-badge";
import { db } from "@/db";
import { getMaschinenVonNutzer } from "@/db/queries";
import { clubs, roleAssignments, roles, user } from "@/db/schema";
import { modellName } from "@/lib/format";
import { requireSuperAdmin } from "@/lib/session";

/*
  ⚠️ TEMPORÄRES DEBUG-FEATURE — bitte später wieder entfernen. ⚠️

  Zeigt einem Super-Admin, welche Maschinen ein bestimmter Nutzer sehen kann
  (eigene + über Club-Mitgliedschaft) und WARUM. Gedacht ausschließlich zur
  Fehlersuche an der Sichtbarkeits-/Autorisierungslogik.

  Bewusst wird hier `getMaschinenVonNutzer()` verwendet — dieselbe
  Query wie in der echten Maschinenliste. Eine nachgebaute Logik würde beim
  Debuggen genau die Abweichungen verstecken, die man finden will.

  Kein eigener Guard: der Super-Admin-Check sitzt im admin/layout.tsx und deckt
  alle /admin/*-Seiten ab.

  Zum Entfernen: dieses Verzeichnis löschen und den Link in
  src/app/(app)/admin/page.tsx entfernen.
*/

export default async function VisibilityDebugPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const ziel = await db.query.user.findFirst({ where: eq(user.id, userId) });
  if (!ziel) notFound();

  // Rollen des Nutzers (global + je Club) — als Kontext für die Sichtbarkeit.
  const zuweisungen = await db
    .select({
      rolle: roles.key,
      scope: roles.scope,
      clubName: clubs.name,
    })
    .from(roleAssignments)
    .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
    .leftJoin(clubs, eq(roleAssignments.clubId, clubs.id))
    .where(eq(roleAssignments.userId, userId));

  const globaleRollen = zuweisungen.filter((z) => z.scope === "global");
  const clubRollen = zuweisungen.filter((z) => z.scope === "club");

  // Eigenes Gate statt Verlass auf das Admin-Layout: getMaschinenVonNutzer
  // verlangt den handelnden Nutzer und prüft die Super-Admin-Rolle selbst.
  const me = await requireSuperAdmin();
  // DIESELBE Abfrage wie in der Maschinenliste — nur mit fremder userId.
  const sichtbar = await getMaschinenVonNutzer(me, userId);
  const eigene = sichtbar.filter((m) => m.ownerId === userId);
  const ueberClub = sichtbar.filter((m) => m.ownerId !== userId);

  return (
    <div className="space-y-6">
      {/* Der Hinweis steht bewusst ganz oben und ist nicht zu übersehen.
          (Bleibt handgerollt — Debug-Einmaling, fliegt mit der Seite wieder raus.) */}
      <div
        className="flex gap-3 rounded-[var(--radius)] border border-[var(--color-warn)] p-3"
        style={{
          background: "color-mix(in srgb, var(--color-warn) 10%, transparent)",
        }}
      >
        <FlaskConical
          size={18}
          className="mt-0.5 flex-none text-[var(--color-warn)]"
        />
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            Temporäres Debug-Feature — wird später entfernt
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            Diese Ansicht dient ausschließlich der Fehlersuche an der
            Sichtbarkeits- und Rechtelogik. Sie ist nicht Teil des regulären
            Funktionsumfangs und verschwindet wieder, sobald sie ihren Zweck
            erfüllt hat. Angezeigt wird das Ergebnis derselben Query, die auch
            die echte Maschinenliste des Nutzers füllt.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-bold">Sichtbarkeit: {ziel.name}</h2>
        <p className="text-[var(--color-muted)]">{ziel.email}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {globaleRollen.length > 0 ? (
            globaleRollen.map((r) => (
              <StatusBadge key={r.rolle} value={r.rolle} />
            ))
          ) : (
            <span className="text-xs text-[var(--color-faint)]">
              keine globale Rolle
            </span>
          )}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          Club-Mitgliedschaften ({clubRollen.length})
        </h2>
        <List empty="In keinem Club — sieht daher nur eigene Maschinen.">
          {clubRollen.map((c) => (
            <ListRow
              key={`${c.clubName}-${c.rolle}`}
              title={c.clubName}
              meta={<StatusBadge value={c.rolle} />}
            />
          ))}
        </List>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          Sichtbare Maschinen ({sichtbar.length})
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          {eigene.length} eigene · {ueberClub.length} über Club-Mitgliedschaft
        </p>

        <List empty="Dieser Nutzer sieht aktuell keine Maschinen.">
          {sichtbar.map((m) => {
            const istEigene = m.ownerId === userId;
            return (
              <ListRow
                key={m.id}
                href={`/machines/${m.id}`}
                title={modellName(m)}
                subtitle={
                  istEigene
                    ? `Eigentümer${m.club?.name ? ` · geteilt mit „${m.club.name}"` : ""}`
                    : `über Club „${m.club?.name ?? "?"}"`
                }
                meta={<StatusBadge value={istEigene ? "eigene" : "Club"} />}
              />
            );
          })}
        </List>
      </section>

      <Link
        href="/admin"
        className="inline-block text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      >
        ← Zurück zur Administration
      </Link>
    </div>
  );
}
