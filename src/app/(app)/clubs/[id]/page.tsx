import { eq } from "drizzle-orm";
import Link from "next/link";
import { Trash2, UserMinus } from "lucide-react";
import { AddMemberForm } from "@/components/add-member-form";
import { MachineCard } from "@/components/machine-card";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { addMember, deleteClub, removeMember } from "@/db/actions/clubs";
import { db } from "@/db";
import { clubs, machines, memberships, user } from "@/db/schema";
import { isClubAdmin, requireClubMember } from "@/lib/session";

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await requireClubMember(id);
  const admin = await isClubAdmin(currentUser.id, id);

  const club = await db.query.clubs.findFirst({ where: eq(clubs.id, id) });
  if (!club) return null;

  const members = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      rolle: memberships.rolle,
    })
    .from(memberships)
    .innerJoin(user, eq(memberships.userId, user.id))
    .where(eq(memberships.clubId, id))
    .orderBy(memberships.rolle);

  const clubMachines = await db.query.machines.findMany({
    where: eq(machines.clubId, id),
    with: { club: { columns: { name: true } } },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{club.name}</h1>
        {admin ? (
          <form action={deleteClub}>
            <input type="hidden" name="clubId" value={club.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
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
              <div className="flex items-center gap-3">
                <StatusBadge value={member.rolle} />
                {admin && member.id !== currentUser.id ? (
                  <form action={removeMember}>
                    <input type="hidden" name="clubId" value={club.id} />
                    <input type="hidden" name="userId" value={member.id} />
                    <button
                      type="submit"
                      aria-label="Mitglied entfernen"
                      className="text-[var(--color-muted)] hover:text-red-600"
                    >
                      <UserMinus size={16} />
                    </button>
                  </form>
                ) : null}
              </div>
            </Card>
          ))}
        </div>

        {admin ? (
          <Card>
            <AddMemberForm action={addMember} clubId={club.id} />
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
