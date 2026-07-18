import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Trash2, X } from "lucide-react";
import { AddMemberForm } from "@/components/add-member-form";
import { MachineCard } from "@/components/machine-card";
import { MemberActions } from "@/components/member-actions";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteClub } from "@/db/actions/clubs";
import { inviteMember, revokeInvitation } from "@/db/actions/invitations";
import { db } from "@/db";
import {
  clubs,
  invitations,
  machines,
  roleAssignments,
  roles,
  user,
} from "@/db/schema";
import {
  isClubManager,
  isClubOwner,
  requireClubMember,
} from "@/lib/session";
import type { ClubRole } from "@/lib/validators";

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await requireClubMember(id);
  const manager = await isClubManager(currentUser.id, id);
  const owner = await isClubOwner(currentUser.id, id);

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

  const clubMachines = await db.query.machines.findMany({
    where: eq(machines.clubId, id),
    with: { club: { columns: { name: true } } },
  });

  // Offene Einladungen (nur für Manager sichtbar).
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
          and(eq(invitations.clubId, id), eq(invitations.status, "pending")),
        )
        .orderBy(desc(invitations.createdAt))
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{club.name}</h1>
        {owner ? (
          <form action={deleteClub}>
            <input type="hidden" name="clubId" value={club.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-danger)]/40 px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
            >
              <Trash2 size={15} /> Club löschen
            </button>
          </form>
        ) : null}
      </div>

      {/* Mitglieder */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mitglieder</h2>
        <div className="space-y-2">
          {members.map((member) => (
            <Card
              key={member.id}
              className="flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{member.name}</p>
                <p className="truncate text-sm text-[var(--color-muted)]">
                  {member.email}
                </p>
              </div>
              <MemberActions
                clubId={club.id}
                memberId={member.id}
                rolle={member.rolle as ClubRole}
                isSelf={member.id === currentUser.id}
                canManage={manager}
                canManageOwner={owner}
              />
            </Card>
          ))}
        </div>

        {manager ? (
          <Card className="space-y-4">
            <AddMemberForm
              action={inviteMember}
              clubId={club.id}
              allowOwner={owner}
            />

            {pendingInvites.length > 0 ? (
              <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
                <p className="text-xs font-medium text-[var(--color-muted)]">
                  Offene Einladungen
                </p>
                {pendingInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate">{inv.email}</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge value={inv.rolle} />
                      <form action={revokeInvitation}>
                        <input type="hidden" name="clubId" value={club.id} />
                        <input type="hidden" name="invitationId" value={inv.id} />
                        <button
                          type="submit"
                          aria-label="Einladung zurückziehen"
                          className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                        >
                          <X size={16} />
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        ) : null}
      </section>

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

      <Link
        href="/clubs"
        className="inline-block text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      >
        ← Alle Clubs
      </Link>
    </div>
  );
}
