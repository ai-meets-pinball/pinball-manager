import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import Link from "next/link";
import { ChevronDown, FlaskConical } from "lucide-react";
import { AdminClubRoles } from "@/components/admin-club-roles";
import { InviteUserForm } from "@/components/invite-user-form";
import { RoleInfo } from "@/components/role-info";
import { Button } from "@/components/ui/button";
import { AddDisclosure } from "@/components/ui/add-disclosure";
import { Card, cardSurface } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { List, ListRow } from "@/components/ui/list";
import { StatusBadge } from "@/components/ui/status-badge";
import { setGlobalRole } from "@/db/actions/admin";
import { revokePlatformInvitation } from "@/db/actions/invitations";
import { getAllClubsBasic, getClubRolesByUser } from "@/db/queries";
import { db } from "@/db";
import { invitations, roleAssignments, roles, user } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { KURATOR_ROLE, SUPERADMIN_ROLE } from "@/lib/validators";

/* Anzeige-Label für den `scope` im Rollen-Katalog. */
const SCOPE_LABEL: Record<string, string> = {
  basis: "Basis",
  club: "Club",
  global: "Global",
};

/* Der Katalog wird nach diesen Achsen gruppiert dargestellt — so wird klar,
   dass Club-Rollen immer an einem Club hängen und Grundstufen nicht zuweisbar
   sind. Reihenfolge = Reihenfolge der Blöcke. */
const ACHSEN: { scope: string; titel: string; hinweis: string }[] = [
  {
    scope: "basis",
    titel: "Grundstufen",
    hinweis:
      "Nicht zuweisbar — sie benennen nur vorhandene Zustände (kein Konto bzw. Konto ohne Club-Rolle).",
  },
  {
    scope: "club",
    titel: "Club-Rollen",
    hinweis:
      "Gelten immer in genau einem Club. Ein Nutzer kann in mehreren Clubs Rollen haben — z. B. Mitglied in mehreren Clubs und Owner in einem anderen.",
  },
  {
    scope: "global",
    titel: "Globale Rollen",
    hinweis: "Gelten plattformweit, unabhängig von Clubs. Frei mit Club-Rollen kombinierbar.",
  },
];

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

  // Club-Rollen je Nutzer (club-bezogene Zuweisungen samt Club-Name) + Katalog
  // aller Clubs für die Auswahlfelder der Vergabe.
  const clubRoleRows = await getClubRolesByUser();
  const clubRolesByUser = new Map<
    string,
    { clubId: string; clubName: string; rolle: string }[]
  >();
  for (const r of clubRoleRows) {
    clubRolesByUser.set(r.userId, [
      ...(clubRolesByUser.get(r.userId) ?? []),
      { clubId: r.clubId, clubName: r.clubName, rolle: r.rolle },
    ]);
  }
  const allClubs = await getAllClubsBasic();

  // Rollen-Katalog (Daten statt Enum) — zur Orientierung, nach Achsen gruppiert.
  const katalog = await db.select().from(roles).orderBy(roles.scope, roles.rang);

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
          <AddDisclosure label="Neue Einladung">
            <InviteUserForm />
          </AddDisclosure>

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
          Jede Person kann mehrere Rollen halten: globale (Kurator/Super-Admin)
          und je Club eine Club-Rolle. Verwalten über „Rollen verwalten".
          &bdquo;Sichtbarkeit&ldquo; ist ein temporäres Debug-Werkzeug.
        </p>
        <List empty="Noch keine Nutzer.">
          {users.map((u) => {
            const meineRollen = rolesByUser.get(u.id) ?? [];
            const istSuper = meineRollen.includes(SUPERADMIN_ROLE);
            const istKurator = meineRollen.includes(KURATOR_ROLE);
            const meineClubRollen = clubRolesByUser.get(u.id) ?? [];
            const hatKeineRolle =
              !istSuper && !istKurator && meineClubRollen.length === 0;
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
                    {istKurator ? <StatusBadge value="kurator" /> : null}
                    {meineClubRollen.map((c) => (
                      <span
                        key={c.clubId}
                        className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)]"
                      >
                        {c.clubName} <StatusBadge value={c.rolle} />
                      </span>
                    ))}
                    {hatKeineRolle ? (
                      <span className="text-xs text-[var(--color-faint)]">
                        keine Rolle
                      </span>
                    ) : null}
                  </>
                }
              >
                {/* Verwaltung, eingeklappt: globale Rollen + Club-Rollen. */}
                <details className="group mt-1 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium hover:bg-[var(--color-inset)] [&::-webkit-details-marker]:hidden">
                    Rollen verwalten
                    <ChevronDown
                      size={16}
                      className="text-[var(--color-muted)] transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <div className="space-y-3 border-t border-[var(--color-border)] px-3 py-3">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-[var(--color-faint)]">
                        Globale Rollen
                      </p>
                      {u.id !== me.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {/* VERGEBEN ist reversibel → Button; ENTZIEHEN → ConfirmButton. */}
                          <form action={setGlobalRole}>
                            <input type="hidden" name="userId" value={u.id} />
                            <input
                              type="hidden"
                              name="rolle"
                              value="superadmin"
                            />
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
                            <input type="hidden" name="rolle" value="kurator" />
                            <input
                              type="hidden"
                              name="grant"
                              value={istKurator ? "false" : "true"}
                            />
                            {istKurator ? (
                              <ConfirmButton
                                question="Kurator wirklich entziehen?"
                                confirmLabel="Ja, entziehen"
                              >
                                Kurator entziehen
                              </ConfirmButton>
                            ) : (
                              <Button type="submit" variant="secondary" size="sm">
                                Zum Kurator
                              </Button>
                            )}
                          </form>
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--color-faint)]">
                          Die eigene globale Rolle lässt sich hier nicht ändern.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-[var(--color-faint)]">
                        Club-Rollen{" "}
                        <span className="font-normal">
                          (immer in genau einem Club)
                        </span>
                      </p>
                      <AdminClubRoles
                        userId={u.id}
                        clubRoles={meineClubRollen}
                        allClubs={allClubs}
                      />
                    </div>
                  </div>
                </details>
              </ListRow>
            );
          })}
        </List>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Rollen-Katalog</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Rollen sind Daten (Tabelle <code>roles</code>), keine Enum-Werte.
          Zuweisungen liegen in <code>role_assignments</code> — global (ohne Club)
          oder club-bezogen (ein Eintrag je Club = die Mitgliedschaft).
        </p>
        <div className="space-y-4">
          {ACHSEN.map((achse) => {
            const zeilen = katalog.filter((r) => r.scope === achse.scope);
            if (zeilen.length === 0) return null;
            return (
              <div key={achse.scope} className="space-y-2">
                <div>
                  <p className="text-sm font-semibold">{achse.titel}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {achse.hinweis}
                  </p>
                </div>
                {/* Eigene Zeilen statt ListRow: die Beschreibung soll voll
                    umbrechen, nicht in einer Zeile trunkiert werden. */}
                <ul className="space-y-2">
                  {zeilen.map((r) => (
                    <li
                      key={r.id}
                      className={`${cardSurface} flex flex-wrap items-start justify-between gap-3`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {r.label}{" "}
                          <span className="font-mono text-xs text-[var(--color-faint)]">
                            {r.key}
                          </span>
                        </p>
                        {r.beschreibung ? (
                          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                            {r.beschreibung}
                          </p>
                        ) : null}
                      </div>
                      <span className="flex-none font-mono text-xs text-[var(--color-muted)]">
                        {r.scope === "basis"
                          ? SCOPE_LABEL.basis
                          : `${SCOPE_LABEL[r.scope] ?? r.scope} · Rang ${r.rang}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
