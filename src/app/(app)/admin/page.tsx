import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { LayoutGrid, List as ListIcon } from "lucide-react";
import { cookies } from "next/headers";
import { RememberParams } from "@/components/remember-params";
import { NutzerLoeschen } from "@/components/admin-user-delete";
import {
  AdminUserRoles,
  NutzerZeile,
  RolleHinzufuegen,
} from "@/components/admin-user-roles";
import { InviteUserForm } from "@/components/invite-user-form";
import { RoleInfo } from "@/components/role-info";
import { AddDisclosure } from "@/components/ui/add-disclosure";
import { Card, cardSurface } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { List, ListRow } from "@/components/ui/list";
import { ViewToggle } from "@/components/ui/view-toggle";
import { revokePlatformInvitation } from "@/db/actions/invitations";
import { getAllClubsBasic, getClubRolesByUser } from "@/db/queries";
import { db } from "@/db";
import { invitations, roleAssignments, roles, user } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { klebrig } from "@/lib/sticky-view";
import { SUPERADMIN_ROLE } from "@/lib/validators";

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

/* Nutzer & Rollen (Super-Admin). Guard + Rahmen/Navigation im admin/layout.tsx.
   Query-Parameter: ansicht (karten | liste) — Karten zeigen je Person die
   Rollen-Verwaltung offen, die Liste ist die kompakte Übersicht. */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ansicht?: string }>;
}) {
  const me = await requireUser();
  const sp = await searchParams;
  const ansicht = klebrig(
    sp.ansicht,
    (await cookies()).get("nutzerView")?.value,
    (v) => v === "karten" || v === "liste",
    "karten",
  ) as "karten" | "liste";

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

  // Zähler für die Sperr-Regeln (rolleEntfernenGesperrt): Owner je Club und
  // Super-Admins insgesamt — damit der Papierkorb schon im UI sagt, warum nicht.
  const ownerAnzahl: Record<string, number> = {};
  for (const r of clubRoleRows) {
    if (r.rolle === "owner") ownerAnzahl[r.clubId] = (ownerAnzahl[r.clubId] ?? 0) + 1;
  }
  const superAdminAnzahl = globalRoles.filter((r) => r.key === SUPERADMIN_ROLE).length;

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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-lg font-semibold">
            Nutzer ({users.length})
            <RoleInfo
              roles={katalog.filter((r) => r.scope === "global")}
              titel="Globale Rollen"
            />
          </h2>
          <RememberParams path="/admin" params={{ nutzerView: ansicht }} />
          <ViewToggle
            options={[
              {
                href: "/admin?ansicht=karten",
                label: "Kartenansicht",
                icon: <LayoutGrid size={16} />,
                active: ansicht === "karten",
              },
              {
                href: "/admin?ansicht=liste",
                label: "Listenansicht",
                icon: <ListIcon size={16} />,
                active: ansicht === "liste",
              },
            ]}
          />
        </div>
        <p className="text-sm text-[var(--color-muted)]">
          Jede Person kann mehrere Rollen halten: globale (Kurator/Super-Admin)
          und je Club eine Club-Rolle. Karten zeigen sie offen unter der Person;
          in der Liste klappt der Stift die Bearbeitung auf.
        </p>
        <List empty="Noch keine Nutzer." kompakt={ansicht === "liste"}>
          {users.map((u) => {
            const meineRollen = rolesByUser.get(u.id) ?? [];
            const meineClubRollen = clubRolesByUser.get(u.id) ?? [];
            const rollenProps = {
              userId: u.id,
              istSelbst: u.id === me.id,
              globalRoles: meineRollen,
              clubRoles: meineClubRollen,
              allClubs,
              ownerAnzahl,
              superAdminAnzahl,
            };
            // Liste: kompakte Zeile, Stift klappt den Editor auf.
            const loeschen = (
              <NutzerLoeschen
                userId={u.id}
                name={u.name}
                istSelbst={u.id === me.id}
              />
            );
            if (ansicht === "liste") {
              return (
                <NutzerZeile
                  key={u.id}
                  name={u.name}
                  email={u.email}
                  aktionen={loeschen}
                  {...rollenProps}
                />
              );
            }
            // Karte: Rollen offen, keine Klappe — eine Zeile je Rolle.
            return (
              <ListRow
                key={u.id}
                title={u.name}
                subtitle={u.email}
                meta={
                  <>
                    <RolleHinzufuegen {...rollenProps} />
                    {loeschen}
                  </>
                }
              >
                <div className="border-t border-[var(--color-line)] pt-1">
                  <AdminUserRoles {...rollenProps} />
                </div>
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
