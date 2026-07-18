import Link from "next/link";
import { and, eq, gte, sql } from "drizzle-orm";
import { ChangePasswordForm, ProfileForm } from "@/components/account-forms";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  acceptInvitation,
  declineInvitation,
} from "@/db/actions/invitations";
import { db } from "@/db";
import { clubs, invitations, roles } from "@/db/schema";
import { getUserClubs } from "@/db/queries";
import { isSuperAdmin, requireUser } from "@/lib/session";

export default async function AccountPage() {
  const user = await requireUser();

  const myClubs = await getUserClubs(user.id);

  // Ablauf serverseitig per SQL now() prüfen (kein Date.now() im Render).
  const offeneInvites = await db
    .select({
      id: invitations.id,
      token: invitations.token,
      rolle: roles.key,
      clubName: clubs.name,
    })
    .from(invitations)
    .innerJoin(roles, eq(invitations.roleId, roles.id))
    .innerJoin(clubs, eq(invitations.clubId, clubs.id))
    .where(
      and(
        eq(invitations.email, user.email.toLowerCase()),
        eq(invitations.status, "pending"),
        gte(invitations.expiresAt, sql`now()`),
      ),
    );

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <h1 className="text-2xl font-bold">Konto</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Profil</h2>
        <Card>
          <p className="mb-3 text-sm text-[var(--color-muted)]">
            Angemeldet als {user.email}
            {isSuperAdmin(user) ? (
              <span className="ml-2">
                <StatusBadge value="superadmin" />
              </span>
            ) : null}
          </p>
          <ProfileForm initialName={user.name} />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Passwort ändern</h2>
        <Card>
          <ChangePasswordForm />
        </Card>
      </section>

      {offeneInvites.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Einladungen</h2>
          {offeneInvites.map((inv) => (
            <Card
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="font-medium">{inv.clubName}</p>
                <p className="text-sm text-[var(--color-muted)]">
                  Rolle: <StatusBadge value={inv.rolle} />
                </p>
              </div>
              <div className="flex items-center gap-2">
                <form action={acceptInvitation}>
                  <input type="hidden" name="token" value={inv.token} />
                  <button
                    type="submit"
                    className="rounded-[var(--radius)] bg-[var(--color-primary)] px-3 py-1.5 text-sm text-[var(--color-primary-fg)] hover:bg-[var(--color-accent)]"
                  >
                    Annehmen
                  </button>
                </form>
                <form action={declineInvitation}>
                  <input type="hidden" name="invitationId" value={inv.id} />
                  <button
                    type="submit"
                    className="rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                  >
                    Ablehnen
                  </button>
                </form>
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Meine Clubs</h2>
        {myClubs.length === 0 ? (
          <p className="text-[var(--color-muted)]">
            Du bist in keinem Club.{" "}
            <Link href="/clubs" className="text-[var(--color-accent)] underline">
              Clubs ansehen
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {myClubs.map((c) => (
              <Card
                key={c.id}
                className="flex items-center justify-between gap-3"
              >
                <Link href={`/clubs/${c.id}`} className="font-medium hover:underline">
                  {c.name}
                </Link>
                <StatusBadge value={c.rolle} />
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
