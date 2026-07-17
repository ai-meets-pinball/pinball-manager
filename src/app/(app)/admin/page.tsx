import { count, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { setUserRole } from "@/db/actions/admin";
import { deleteClub } from "@/db/actions/clubs";
import { db } from "@/db";
import { clubs, memberships, user } from "@/db/schema";
import { isSuperAdmin, requireUser } from "@/lib/session";

/*
  Super-Admin-Bereich. Der Cookie-Check in proxy.ts ist nur optimistisch —
  die echte Grenze ist requireUser + isSuperAdmin hier.
*/
export default async function AdminPage() {
  const me = await requireUser();
  if (!isSuperAdmin(me)) redirect("/machines");

  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })
    .from(user)
    .orderBy(user.email);

  const clubList = await db
    .select({
      id: clubs.id,
      name: clubs.name,
      members: count(memberships.id),
    })
    .from(clubs)
    .leftJoin(memberships, eq(memberships.clubId, clubs.id))
    .groupBy(clubs.id, clubs.name)
    .orderBy(clubs.name);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Administration</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Nutzer ({users.length})</h2>
        <div className="space-y-2">
          {users.map((u) => (
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
                <StatusBadge value={u.role === "superadmin" ? "superadmin" : "member"} />
                {u.id !== me.id ? (
                  <form action={setUserRole}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input
                      type="hidden"
                      name="role"
                      value={u.role === "superadmin" ? "user" : "superadmin"}
                    />
                    <button
                      type="submit"
                      className="rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]/40"
                    >
                      {u.role === "superadmin"
                        ? "Super-Admin entziehen"
                        : "Zum Super-Admin"}
                    </button>
                  </form>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Clubs ({clubList.length})</h2>
        <div className="space-y-2">
          {clubList.map((c) => (
            <Card
              key={c.id}
              className="flex items-center justify-between gap-3"
            >
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
    </div>
  );
}
