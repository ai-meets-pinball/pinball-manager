import { and, count, desc, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { InviteUserForm } from "@/components/invite-user-form";
import { RoleInfo } from "@/components/role-info";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { List, ListRow } from "@/components/ui/list";
import { StatusBadge } from "@/components/ui/status-badge";
import { setGlobalRole } from "@/db/actions/admin";
import { revokePlatformInvitation } from "@/db/actions/invitations";
import { db } from "@/db";
import { invitations, roleAssignments, roles, user } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { SUPERADMIN_ROLE, SUPPORTER_ROLE } from "@/lib/validators";

/* Nutzer & Rollen (Super-Admin). Guard + Rahmen/Navigation im admin/layout.tsx. */
export default async function AdminPage() {
  const me = await requireUser();

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

  // Rollen-Katalog (Daten statt Enum) — zur Orientierung.
  const katalog = await db.select().from(roles).orderBy(roles.scope, roles.rang);

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
              <List empty="Keine offenen Einladungen.">
                {offeneEinladungen.map((inv) => (
                  <ListRow
                    key={inv.id}
                    title={<span className="text-sm">{inv.email}</span>}
                    actions={
                      <form action={revokePlatformInvitation}>
                        <input
                          type="hidden"
                          name="invitationId"
                          value={inv.id}
                        />
                        <ConfirmButton
                          question="Einladung zurückziehen?"
                          confirmLabel="Ja, zurückziehen"
                        >
                          Zurückziehen
                        </ConfirmButton>
                      </form>
                    }
                  />
                ))}
              </List>
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
          welche Maschinen ein Nutzer sehen kann) und wird später wieder entfernt.
        </p>
        <List empty="Noch keine Nutzer.">
          {users.map((u) => {
            const meineRollen = rolesByUser.get(u.id) ?? [];
            const istSuper = meineRollen.includes(SUPERADMIN_ROLE);
            const istSupporter = meineRollen.includes(SUPPORTER_ROLE);
            return (
              <ListRow
                key={u.id}
                title={u.name}
                subtitle={u.email}
                meta={
                  <>
                    {/* TEMPORÄR (Debug): Sichtbarkeits-Ansicht — siehe
                        admin/visibility/[userId]/page.tsx. Später mit entfernen. */}
                    <Link
                      href={`/admin/visibility/${u.id}`}
                      title="Debug: Welche Maschinen sieht dieser Nutzer?"
                      className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                    >
                      <FlaskConical size={14} /> Sichtbarkeit
                    </Link>
                    {istSuper ? <StatusBadge value="superadmin" /> : null}
                    {istSupporter ? <StatusBadge value="supporter" /> : null}
                    {!istSuper && !istSupporter ? (
                      <span className="text-xs text-[var(--color-faint)]">
                        keine globale Rolle
                      </span>
                    ) : null}
                  </>
                }
                actions={
                  u.id !== me.id ? (
                    <>
                      {/* Regel: VERGEBEN ist reversibel → normaler Button;
                          ENTZIEHEN nimmt Rechte weg → ConfirmButton. */}
                      <form action={setGlobalRole}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="rolle" value="superadmin" />
                        <input
                          type="hidden"
                          name="grant"
                          value={istSuper ? "false" : "true"}
                        />
                        {istSuper ? (
                          <ConfirmButton
                            question="Super-Admin wirklich entziehen?"
                            confirmLabel="Ja, entziehen"
                          >
                            Super-Admin entziehen
                          </ConfirmButton>
                        ) : (
                          <Button type="submit" variant="secondary" size="sm">
                            Zum Super-Admin
                          </Button>
                        )}
                      </form>
                      <form action={setGlobalRole}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="rolle" value="supporter" />
                        <input
                          type="hidden"
                          name="grant"
                          value={istSupporter ? "false" : "true"}
                        />
                        {istSupporter ? (
                          <ConfirmButton
                            question="Supporter wirklich entziehen?"
                            confirmLabel="Ja, entziehen"
                          >
                            Supporter entziehen
                          </ConfirmButton>
                        ) : (
                          <Button type="submit" variant="secondary" size="sm">
                            Zum Supporter
                          </Button>
                        )}
                      </form>
                    </>
                  ) : null
                }
              />
            );
          })}
        </List>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Rollen-Katalog</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Rollen sind Daten (Tabelle <code>roles</code>), keine Enum-Werte.
          Zuweisungen liegen in <code>role_assignments</code> — global (ohne Club)
          oder je Club ({clubAssignments} Club-Zuweisungen).
        </p>
        <List empty="Kein Rollen-Katalog — Migration 0004 fehlt?">
          {katalog.map((r) => (
            <ListRow
              key={r.id}
              title={
                <>
                  {r.label}{" "}
                  <span className="font-mono text-xs text-[var(--color-faint)]">
                    {r.key}
                  </span>
                </>
              }
              subtitle={r.beschreibung ?? undefined}
              meta={
                <span className="font-mono text-xs text-[var(--color-muted)]">
                  {r.scope} · Rang {r.rang}
                </span>
              }
            />
          ))}
        </List>
      </section>
    </div>
  );
}
