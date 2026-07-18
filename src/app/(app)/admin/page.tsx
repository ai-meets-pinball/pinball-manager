import { and, count, desc, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FlaskConical, Trash2 } from "lucide-react";
import { InviteUserForm } from "@/components/invite-user-form";
import { RoleInfo } from "@/components/role-info";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { setSuperAdmin } from "@/db/actions/admin";
import { deleteClub } from "@/db/actions/clubs";
import { revokePlatformInvitation } from "@/db/actions/invitations";
import { db } from "@/db";
import { clubs, invitations, roleAssignments, roles, user } from "@/db/schema";
import { isSuperAdmin, requireUser } from "@/lib/session";
import { SUPERADMIN_ROLE } from "@/lib/validators";

/*
  Super-Admin-Bereich. Der Cookie-Check in proxy.ts ist nur optimistisch —
  die echte Grenze ist requireUser + isSuperAdmin hier.
*/
export default async function AdminPage() {
  const me = await requireUser();
  if (!isSuperAdmin(me)) redirect("/machines");

  const users = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .orderBy(user.email);

  // Globale Rollen je Nutzer (clubId = NULL).
  const globalRoles = await db
    .select({ userId: roleAssignments.userId, key: roles.key })
    .from(roleAssignments)
    .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
    .where(isNull(roleAssignments.clubId));
  const rolesByUser = new Map<string, string[]>();
  for (const r of globalRoles) {
    rolesByUser.set(r.userId, [...(rolesByUser.get(r.userId) ?? []), r.key]);
  }

  const clubList = await db
    .select({
      id: clubs.id,
      name: clubs.name,
      members: count(roleAssignments.id),
    })
    .from(clubs)
    .leftJoin(roleAssignments, eq(roleAssignments.clubId, clubs.id))
    .groupBy(clubs.id, clubs.name)
    .orderBy(clubs.name);

  // Rollen-Katalog (Daten statt Enum) — zur Orientierung.
  const katalog = await db
    .select()
    .from(roles)
    .orderBy(roles.scope, roles.rang);

  // Anzahl Club-Zuweisungen gesamt (nur informativ).
  const [{ value: clubAssignments } = { value: 0 }] = await db
    .select({ value: count(roleAssignments.id) })
    .from(roleAssignments)
    .where(isNotNull(roleAssignments.clubId));

  // Offene Plattform-Einladungen (ohne Club), noch nicht abgelaufen.
  const offeneEinladungen = await db
    .select({ id: invitations.id, email: invitations.email })
    .from(invitations)
    .where(
      and(
        isNull(invitations.clubId),
        eq(invitations.status, "pending"),
        gte(invitations.expiresAt, sql`now()`),
      ),
    )
    .orderBy(desc(invitations.createdAt));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Administration</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Nutzer einladen</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Die Registrierung ist nur mit Einladung möglich. Wer hier eingeladen
          wird, kann sich über den Link ein Konto anlegen — eine Club-Zuordnung
          passiert dabei nicht (dafür lädst du im jeweiligen Club ein).
        </p>
        <Card className="space-y-4">
          <InviteUserForm />

          {offeneEinladungen.length > 0 ? (
            <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
              <p className="text-xs font-medium text-[var(--color-muted)]">
                Offene Einladungen
              </p>
              {offeneEinladungen.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate">{inv.email}</span>
                  <form action={revokePlatformInvitation}>
                    <input type="hidden" name="invitationId" value={inv.id} />
                    <button
                      type="submit"
                      className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                    >
                      Zurückziehen
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-lg font-semibold">
          Nutzer ({users.length})
          <RoleInfo
            roles={katalog.filter((r) => r.scope === "global")}
            titel="Globale Rollen"
          />
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          &bdquo;Sichtbarkeit&ldquo; ist ein temporäres Debug-Werkzeug (zeigt,
          welche Maschinen ein Nutzer sehen kann) und wird später wieder
          entfernt.
        </p>
        <div className="space-y-2">
          {users.map((u) => {
            const meineRollen = rolesByUser.get(u.id) ?? [];
            const istSuper = meineRollen.includes(SUPERADMIN_ROLE);
            return (
              <Card
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{u.name}</p>
                  <p className="truncate text-sm text-[var(--color-muted)]">
                    {u.email}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* TEMPORÄR (Debug): Sichtbarkeits-Ansicht — siehe
                      admin/visibility/[userId]/page.tsx. Später mit entfernen. */}
                  <Link
                    href={`/admin/visibility/${u.id}`}
                    title="Debug: Welche Maschinen sieht dieser Nutzer?"
                    className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                  >
                    <FlaskConical size={14} /> Sichtbarkeit
                  </Link>
                  {istSuper ? (
                    <StatusBadge value="superadmin" />
                  ) : (
                    <span className="text-xs text-[var(--color-faint)]">
                      keine globale Rolle
                    </span>
                  )}
                  {u.id !== me.id ? (
                    <form action={setSuperAdmin}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input
                        type="hidden"
                        name="grant"
                        value={istSuper ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]/40"
                      >
                        {istSuper ? "Super-Admin entziehen" : "Zum Super-Admin"}
                      </button>
                    </form>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Clubs ({clubList.length})</h2>
        <div className="space-y-2">
          {clubList.map((c) => (
            <Card key={c.id} className="flex items-center justify-between gap-3">
              <div>
                <Link
                  href={`/clubs/${c.id}`}
                  className="font-medium hover:underline"
                >
                  {c.name}
                </Link>
                <p className="text-sm text-[var(--color-muted)]">
                  {c.members} Mitglied(er)
                </p>
              </div>
              <form action={deleteClub}>
                <input type="hidden" name="clubId" value={c.id} />
                <button
                  type="submit"
                  aria-label="Club löschen"
                  className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                >
                  <Trash2 size={16} />
                </button>
              </form>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Rollen-Katalog</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Rollen sind Daten (Tabelle <code>roles</code>), keine Enum-Werte.
          Zuweisungen liegen in <code>role_assignments</code> — global
          (ohne Club) oder je Club ({clubAssignments} Club-Zuweisungen).
        </p>
        <div className="space-y-2">
          {katalog.map((r) => (
            <Card key={r.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {r.label}{" "}
                  <span className="font-mono text-xs text-[var(--color-faint)]">
                    {r.key}
                  </span>
                </p>
                {r.beschreibung ? (
                  <p className="text-sm text-[var(--color-muted)]">
                    {r.beschreibung}
                  </p>
                ) : null}
              </div>
              <span className="font-mono text-xs text-[var(--color-muted)]">
                {r.scope} · Rang {r.rang}
              </span>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
