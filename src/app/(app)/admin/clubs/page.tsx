import { count, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { List, ListRow } from "@/components/ui/list";
import { deleteClubByAdmin } from "@/db/actions/admin";
import { db } from "@/db";
import { clubs, roleAssignments } from "@/db/schema";
import { ActionForm } from "@/components/ui/action-form";
import { ICON_BTN } from "@/components/ui/icon-button";
import { anzahl } from "@/lib/format";

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
            subtitle={anzahl(c.members, "Mitglied", "Mitglieder")}
            actions={
              <ActionForm action={deleteClubByAdmin}>
                <input type="hidden" name="clubId" value={c.id} />
                <ConfirmButton
                  question={`Club „${c.name}" löschen? Maschinen bleiben bei ihren Eigentümern; Mitgliedschaften und Einladungen werden entfernt.`}
                  confirmLabel="Ja, löschen"
                  aria-label="Club löschen"
                  title="Club löschen"
                  className={`${ICON_BTN} hover:text-[var(--color-danger)]`}
                >
                  <Trash2 size={14} />
                </ConfirmButton>
              </ActionForm>
            }
          />
        ))}
      </List>
    </section>
  );
}
