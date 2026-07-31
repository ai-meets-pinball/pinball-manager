import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { deleteClub } from "@/db/actions/clubs";
import { db } from "@/db";
import { clubs, roleAssignments } from "@/db/schema";

/* Clubs verwalten (Super-Admin). Guard sitzt im admin/layout.tsx. */
export default async function AdminClubsPage() {
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

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Clubs ({clubList.length})</h2>
      {clubList.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">Noch keine Clubs.</p>
      ) : (
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
      )}
    </section>
  );
}
