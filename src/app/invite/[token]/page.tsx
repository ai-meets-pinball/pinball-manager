import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { acceptInvitation } from "@/db/actions/invitations";
import { db } from "@/db";
import { clubs, invitations, roles } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

/*
  Einladungs-Landeseite. Der Token kommt aus der E-Mail.
  - Nicht angemeldet → Registrieren (mit ?invite=token) oder Anmelden.
  - Angemeldet mit passender E-Mail → „Einladung annehmen".
  - Angemeldet mit anderer E-Mail → Hinweis.
*/
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Ablauf serverseitig per SQL now() prüfen (kein Date.now() im Render).
  const [invite] = await db
    .select({
      status: invitations.status,
      email: invitations.email,
      rolle: roles.label,
      clubId: invitations.clubId,
      expired: sql<boolean>`${invitations.expiresAt} < now()`,
    })
    .from(invitations)
    .innerJoin(roles, eq(invitations.roleId, roles.id))
    .where(eq(invitations.token, token))
    .limit(1);

  const club = invite
    ? await db.query.clubs.findFirst({ where: eq(clubs.id, invite.clubId) })
    : null;

  const gueltig = invite && invite.status === "pending" && !invite.expired;

  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">Club-Einladung</h1>

      {!gueltig ? (
        <p className="text-sm text-[var(--color-muted)]">
          Diese Einladung ist ungültig, wurde bereits verwendet oder ist
          abgelaufen.{" "}
          <Link href="/login" className="text-[var(--color-accent)] underline">
            Zur Anmeldung
          </Link>
        </p>
      ) : (
        <>
          <p className="text-sm text-[var(--color-muted)]">
            Du wurdest zum Club <strong>{club?.name}</strong> eingeladen (Rolle:{" "}
            {invite!.rolle}). Die Einladung gilt für{" "}
            <strong>{invite!.email}</strong>.
          </p>

          {!user ? (
            <div className="flex flex-col gap-3">
              <Link href={`/register?invite=${token}`}>
                <Button className="w-full">Registrieren &amp; beitreten</Button>
              </Link>
              <p className="text-sm text-[var(--color-muted)]">
                Schon ein Konto?{" "}
                <Link
                  href="/login"
                  className="text-[var(--color-accent)] underline"
                >
                  Anmelden
                </Link>{" "}
                und den Link erneut öffnen.
              </p>
            </div>
          ) : user.email.toLowerCase() !== invite!.email.toLowerCase() ? (
            <p className="text-sm text-[var(--color-danger)]">
              Du bist als {user.email} angemeldet, die Einladung gilt aber für{" "}
              {invite!.email}. Bitte mit dem passenden Konto anmelden.
            </p>
          ) : (
            <form action={acceptInvitation}>
              <input type="hidden" name="token" value={token} />
              <Button type="submit" className="w-full">
                Einladung annehmen
              </Button>
            </form>
          )}
        </>
      )}
    </main>
  );
}
