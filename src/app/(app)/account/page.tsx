import Link from "next/link";
import { and, eq, gte, sql } from "drizzle-orm";
import { ChevronDown, LogOut } from "lucide-react";
import {
  ChangePasswordForm,
  EmailForm,
  ProfileForm,
} from "@/components/account-forms";
import { ShareSettingsForm } from "@/components/share-settings-form";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getSettingsFor } from "@/db/queries";
import { leaveClub } from "@/db/actions/clubs";
import {
  acceptInvitation,
  declineInvitation,
} from "@/db/actions/invitations";
import { db } from "@/db";
import { clubs, invitations, roleAssignments, roles } from "@/db/schema";
import { isSuperAdmin, requireUser } from "@/lib/session";

export default async function AccountPage() {
  const user = await requireUser();
  const shareSettings = await getSettingsFor("user", user.id);

  // Clubs des Nutzers inkl. Owner-Anzahl — damit der letzte Owner nicht
  // versehentlich austritt (die Action würde es ohnehin ablehnen).
  const myClubs = await db
    .select({
      id: clubs.id,
      name: clubs.name,
      rolle: roles.key,
      ownerCount: sql<number>`(
        SELECT count(*)::int FROM ${roleAssignments} ra2
        JOIN ${roles} r2 ON r2.id = ra2.role_id
        WHERE ra2.club_id = ${clubs.id} AND r2.key = 'owner'
      )`,
    })
    .from(roleAssignments)
    .innerJoin(clubs, eq(roleAssignments.clubId, clubs.id))
    .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
    .where(eq(roleAssignments.userId, user.id))
    .orderBy(clubs.name);

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
        <h2 className="text-lg font-semibold">E-Mail-Adresse</h2>
        <Card>
          <EmailForm initialEmail={user.email} />
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
            {myClubs.map((c) => {
              // Der letzte Owner muss erst jemanden befördern.
              const letzterOwner =
                c.rolle === "owner" && Number(c.ownerCount) <= 1;
              return (
                <Card
                  key={c.id}
                  className="flex items-center justify-between gap-3"
                >
                  <Link
                    href={`/clubs/${c.id}`}
                    className="font-medium hover:underline"
                  >
                    {c.name}
                  </Link>
                  <div className="flex items-center gap-3">
                    <StatusBadge value={c.rolle} />
                    {letzterOwner ? (
                      <span
                        className="text-xs text-[var(--color-faint)]"
                        title="Als letzter Owner kannst du nicht austreten — befördere zuerst jemanden zum Owner."
                      >
                        letzter Owner
                      </span>
                    ) : (
                      <form action={leaveClub}>
                        <input type="hidden" name="clubId" value={c.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                        >
                          <LogOut size={14} /> Verlassen
                        </button>
                      </form>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Freigabe-Voreinstellungen</h2>
        <Card>
          <ShareSettingsForm
            werte={shareSettings.werte}
            angepasst={shareSettings.angepasst}
          />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Sicherheit</h2>
        <details className="group overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium hover:bg-[var(--color-inset)]">
            Passwort ändern
            <ChevronDown
              size={16}
              className="text-[var(--color-muted)] transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="border-t border-[var(--color-border)] px-4 py-4">
            <ChangePasswordForm />
          </div>
        </details>
      </section>
    </div>
  );
}
