import { and, desc, eq, gte, sql } from "drizzle-orm";
import { ConfirmButton } from "@/components/ui/confirm-button";
import Link from "next/link";
import { QrCode, Trash2 } from "lucide-react";
import { MitgliedEinladen } from "@/components/add-member-form";
import { ClubLogoForm } from "@/components/club-logo-form";
import { MachineCard } from "@/components/machine-card";
import { MemberActions } from "@/components/member-actions";
import { RoleInfo } from "@/components/role-info";
import { ShareSettingsForm } from "@/components/share-settings-form";
import { Card } from "@/components/ui/card";
import { ICON_BTN } from "@/components/ui/icon-button";
import { List, ListRow } from "@/components/ui/list";
import { PageHeader } from "@/components/ui/page-header";
import { getSettingsFor } from "@/db/queries";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteClub } from "@/db/actions/clubs";
import { revokeInvitation } from "@/db/actions/invitations";
import { db } from "@/db";
import {
  clubs,
  invitations,
  machines,
  roleAssignments,
  roles,
  user,
} from "@/db/schema";
import { getClubRole, requireClubMember } from "@/lib/session";
import { darfClub } from "@/lib/rechte";
import type { ClubRole } from "@/lib/validators";

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await requireClubMember(id);
  // Dieselbe Regel wie in den Actions (lib/rechte.ts) — so sieht ein Super-Admin
  // auch die Controls, die ihm die Actions ohnehin gewähren.
  const rechte = darfClub(currentUser, await getClubRole(currentUser.id, id));
  const manager = rechte.verwalten;
  const owner = rechte.ownerVergeben;

  const club = await db.query.clubs.findFirst({ where: eq(clubs.id, id) });
  if (!club) return null;

  // Mitglieder = club-bezogene Rollenzuweisungen (nach Rang sortiert: Owner zuerst).
  const members = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      rolle: roles.key,
    })
    .from(roleAssignments)
    .innerJoin(user, eq(roleAssignments.userId, user.id))
    .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
    .where(eq(roleAssignments.clubId, id))
    .orderBy(desc(roles.rang));
  // Für die „mind. 1 Owner"-Sperre an Papierkorb/Verlassen/Rolle.
  const ownerAnzahl = members.filter((m) => m.rolle === "owner").length;

  const clubMachines = await db.query.machines.findMany({
    where: eq(machines.clubId, id),
    with: { club: { columns: { name: true } } },
  });

  const clubShareSettings = await getSettingsFor("club", id);

  // Rollen-Katalog (Club-Rollen) für die Erklärung hinter dem Info-Icon.
  const rollenKatalog = await db
    .select({
      key: roles.key,
      label: roles.label,
      beschreibung: roles.beschreibung,
    })
    .from(roles)
    .where(eq(roles.scope, "club"))
    .orderBy(desc(roles.rang));

  // Offene, noch nicht abgelaufene Einladungen (nur für Manager sichtbar).
  // Ablauf serverseitig per SQL now() — eine verfallene Einladung ist nicht „offen".
  const pendingInvites = manager
    ? await db
        .select({
          id: invitations.id,
          email: invitations.email,
          rolle: roles.key,
        })
        .from(invitations)
        .innerJoin(roles, eq(invitations.roleId, roles.id))
        .where(
          and(
            eq(invitations.clubId, id),
            eq(invitations.status, "pending"),
            gte(invitations.expiresAt, sql`now()`),
          ),
        )
        .orderBy(desc(invitations.createdAt))
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        backHref="/clubs"
        backLabel="Clubs"
        title={
          <span className="flex items-center gap-3">
            {club.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={club.logoUrl}
                alt={`Logo ${club.name}`}
                className="h-12 w-12 flex-none rounded-[var(--radius)] object-contain"
              />
            ) : null}
            {club.name}
          </span>
        }
        actions={
          <>
            <Link
              href={`/clubs/${club.id}/qr`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              <QrCode size={15} /> Sammel-QR
            </Link>
            {owner ? (
              <form action={deleteClub}>
                <input type="hidden" name="clubId" value={club.id} />
                <ConfirmButton
                  question="Club endgültig löschen? Maschinen bleiben beim Eigentümer, alle Mitgliedschaften und Einladungen entfallen."
                  confirmLabel="Ja, Club löschen"
                  className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-danger)]/40 px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                >
                  <Trash2 size={15} /> Club löschen
                </ConfirmButton>
              </form>
            ) : null}
          </>
        }
      />

      {/* Mitglieder — eine Zeile je Person, Rolle als Badge, Aktionen rechts. */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-lg font-semibold">
            Mitglieder
            <RoleInfo roles={rollenKatalog} />
          </h2>
          {manager ? (
            <MitgliedEinladen clubId={club.id} allowOwner={owner} />
          ) : null}
        </div>
        <List empty="Noch keine Mitglieder.">
          {members.map((member) => (
            <ListRow
              key={member.id}
              title={member.name}
              subtitle={member.email}
              meta={<StatusBadge value={member.rolle} />}
              actions={
                <MemberActions
                  clubId={club.id}
                  memberId={member.id}
                  name={member.name}
                  rolle={member.rolle as ClubRole}
                  isSelf={member.id === currentUser.id}
                  canManage={manager}
                  canManageOwner={owner}
                  ownerAnzahl={ownerAnzahl}
                />
              }
            />
          ))}
        </List>

        {pendingInvites.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--color-muted)]">
              Offene Einladungen
            </p>
            <List empty="Keine offenen Einladungen." kompakt>
              {pendingInvites.map((inv) => (
                <ListRow
                  key={inv.id}
                  kompakt
                  title={<span className="text-sm">{inv.email}</span>}
                  meta={<StatusBadge value={inv.rolle} />}
                  actions={
                    <form action={revokeInvitation}>
                      <input type="hidden" name="clubId" value={club.id} />
                      <input type="hidden" name="invitationId" value={inv.id} />
                      <ConfirmButton
                        question={`Einladung an ${inv.email} zurückziehen? Der verschickte Link wird ungültig.`}
                        confirmLabel="Ja, zurückziehen"
                        aria-label={`Einladung an ${inv.email} zurückziehen`}
                        title="Einladung zurückziehen"
                        className={`${ICON_BTN} hover:text-[var(--color-danger)]`}
                      >
                        <Trash2 size={14} />
                      </ConfirmButton>
                    </form>
                  }
                />
              ))}
            </List>
          </div>
        ) : null}
      </section>

      {/* Vereins-Logo (nur Owner/Admin) — erscheint u. a. auf den QR-Etiketten. */}
      {manager ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Logo</h2>
          <Card>
            <ClubLogoForm clubId={club.id} hatLogo={Boolean(club.logoUrl)} />
          </Card>
        </section>
      ) : null}

      {/* Freigabe-Voreinstellungen für Club-Maschinen (nur Owner/Admin) */}
      {manager ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Freigabe-Voreinstellungen</h2>
          <Card>
            <ShareSettingsForm
              werte={clubShareSettings.werte}
              angepasst={clubShareSettings.angepasst}
              clubId={club.id}
            />
          </Card>
        </section>
      ) : null}

      {/* Maschinen des Clubs */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Maschinen</h2>
        {clubMachines.length === 0 ? (
          <p className="text-[var(--color-muted)]">
            Noch keine Maschinen in diesem Club. Ordne eine Maschine beim
            Bearbeiten diesem Club zu.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {clubMachines.map((machine) => (
              <MachineCard key={machine.id} machine={machine} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
