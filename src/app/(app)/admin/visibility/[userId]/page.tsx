import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { db } from "@/db";
import { getVisibleMachines } from "@/db/queries";
import { clubs, roleAssignments, roles, user } from "@/db/schema";
import { isSuperAdmin, requireUser } from "@/lib/session";

/*
  ⚠️ TEMPORÄRES DEBUG-FEATURE — bitte später wieder entfernen. ⚠️

  Zeigt einem Super-Admin, welche Maschinen ein bestimmter Nutzer sehen kann
  (eigene + über Club-Mitgliedschaft) und WARUM. Gedacht ausschließlich zur
  Fehlersuche an der Sichtbarkeits-/Autorisierungslogik.

  Bewusst wird hier `getVisibleMachines()` verwendet — also exakt dieselbe
  Query wie in der echten Maschinenliste. Eine nachgebaute Logik würde beim
  Debuggen genau die Abweichungen verstecken, die man finden will.

  Zum Entfernen: dieses Verzeichnis löschen und den Link in
  src/app/(app)/admin/page.tsx entfernen.
*/

export default async function VisibilityDebugPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const me = await requireUser();
  if (!isSuperAdmin(me)) redirect("/machines");

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

  // DIESELBE Query wie in der Maschinenliste — nur mit fremder userId.
  const sichtbar = await getVisibleMachines(userId);
  const eigene = sichtbar.filter((m) => m.ownerId === userId);
  const ueberClub = sichtbar.filter((m) => m.ownerId !== userId);

  return (
    <div className="space-y-6">
      {/* Der Hinweis steht bewusst ganz oben und ist nicht zu übersehen. */}
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
        <h1 className="text-2xl font-bold">Sichtbarkeit: {ziel.name}</h1>
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
        {clubRollen.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            In keinem Club — sieht daher nur eigene Maschinen.
          </p>
        ) : (
          <div className="space-y-2">
            {clubRollen.map((c) => (
              <Card
                key={`${c.clubName}-${c.rolle}`}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="font-medium">{c.clubName}</span>
                <StatusBadge value={c.rolle} />
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          Sichtbare Maschinen ({sichtbar.length})
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          {eigene.length} eigene · {ueberClub.length} über Club-Mitgliedschaft
        </p>

        {sichtbar.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            Dieser Nutzer sieht aktuell keine Maschinen.
          </p>
        ) : (
          <div className="space-y-2">
            {sichtbar.map((m) => {
              const istEigene = m.ownerId === userId;
              return (
                <Card
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/machines/${m.id}`}
                      className="font-medium hover:underline"
                    >
                      {m.hersteller} {m.modell}
                    </Link>
                    <p className="text-sm text-[var(--color-muted)]">
                      {istEigene
                        ? "Eigentümer"
                        : `über Club „${m.club?.name ?? "?"}"`}
                      {istEigene && m.club?.name
                        ? ` · geteilt mit „${m.club.name}"`
                        : ""}
                    </p>
                  </div>
                  <span
                    className="rounded-[4px] px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      color: istEigene
                        ? "var(--color-primary)"
                        : "var(--color-accent)",
                      background: `color-mix(in srgb, ${
                        istEigene
                          ? "var(--color-primary)"
                          : "var(--color-accent)"
                      } 14%, transparent)`,
                    }}
                  >
                    {istEigene ? "eigene" : "Club"}
                  </span>
                </Card>
              );
            })}
          </div>
        )}
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
