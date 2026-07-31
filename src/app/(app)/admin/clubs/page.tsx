import { count, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { List, ListRow } from "@/components/ui/list";
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
      <List empty="Noch keine Clubs.">
        {clubList.map((c) => (
          <ListRow
            key={c.id}
            href={`/clubs/${c.id}`}
            title={c.name}
            subtitle={`${c.members} Mitglied(er)`}
            actions={
              <form action={deleteClub}>
                <input type="hidden" name="clubId" value={c.id} />
                <ConfirmButton
                  question="Club wirklich löschen?"
                  confirmLabel="Ja, löschen"
                  aria-label="Club löschen"
                >
                  <Trash2 size={16} />
                </ConfirmButton>
              </form>
            }
          />
        ))}
      </List>
    </section>
  );
}
