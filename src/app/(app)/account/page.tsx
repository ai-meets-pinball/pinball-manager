import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { and, eq, gte, sql } from "drizzle-orm";
import { LogOut } from "lucide-react";
import {
  ChangePasswordForm,
  EmailForm,
  ProfileForm,
} from "@/components/account-forms";
import { KontoLoeschen } from "@/components/delete-account-form";
import { ShareSettingsForm } from "@/components/share-settings-form";
import {
  WhatsappClubSchalter,
  WhatsappSettingsForm,
} from "@/components/whatsapp-settings-form";
import { UserLogoForm } from "@/components/user-logo-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ICON_BTN } from "@/components/ui/icon-button";
import { List, ListRow } from "@/components/ui/list";
import { StatusBadge } from "@/components/ui/status-badge";
import { getSettingsFor, getUserLogoUrl } from "@/db/queries";
import { getWhatsappStatus } from "@/db/queries/whatsapp";
import { leaveClub } from "@/db/actions/clubs";
import { acceptInvitation, declineInvitation } from "@/db/actions/invitations";
import { db } from "@/db";
import { mindestens, rolleEntfernenGesperrt } from "@/lib/rechte";
import {
  clubs,
  invitations,
  roleAssignments,
  roles,
  user as userTable,
} from "@/db/schema";
import { isSuperAdmin, requireUser } from "@/lib/session";
import { ActionForm } from "@/components/ui/action-form";

export default async function AccountPage() {
  const user = await requireUser();
  // Profilfelder (Vor-/Nachname, Initialen, Bild) aus der user-Zeile — die
  // Better-Auth-Session kennt die App-Erweiterungen nicht.
  const profil = await db.query.user.findFirst({
    where: eq(userTable.id, user.id),
    columns: { firstName: true, lastName: true, initials: true, image: true },
  });
  const shareSettings = await getSettingsFor("user", user.id);
  // WhatsApp: globale Nummer + Clubs, für die das Opt-in aktiv ist.
  const waStatus = await getWhatsappStatus(user.id);
  const aktiveClubs = new Set(waStatus.aktiveClubIds);
  // Persönliches Logo (für QR-Etiketten der privaten Sammlung/Maschinen).
  const logoUrl = await getUserLogoUrl(user.id);

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

  // Clubs, die der Nutzer als Owner/Admin verwaltet — nur dort ist das
  // WhatsApp-Opt-in sinnvoll (nur Owner/Admins erhalten die Meldung).
  const managedClubs = myClubs.filter((c) => mindestens(c.rolle, "admin"));

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
      <PageHeader title="Konto" />

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
          <ProfileForm
            vorname={profil?.firstName ?? null}
            nachname={profil?.lastName ?? null}
            initialenWert={profil?.initials ?? null}
            avatar={profil?.image ?? null}
            name={user.name}
            email={user.email}
          />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Logo &amp; Sammel-QR</h2>
        <Card className="space-y-3">
          <p className="text-sm text-[var(--color-muted)]">
            Dein persönliches Logo erscheint auf den QR-Etiketten deiner privaten
            Maschinen und deiner Sammlung. JPG, PNG oder SVG.
          </p>
          {logoUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="Dein Logo"
                className="h-12 w-12 rounded-[var(--radius)] border border-[var(--color-border)] object-contain"
              />
            </>
          ) : null}
          <UserLogoForm hatLogo={!!logoUrl} />
          <div className="border-t border-[var(--color-border)] pt-3">
            <Link
              href="/account/qr"
              className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
            >
              Sammel-QR deiner privaten Sammlung drucken →
            </Link>
          </div>
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
          <List empty="Keine offenen Einladungen.">
            {offeneInvites.map((inv) => (
              <ListRow
                key={inv.id}
                title={inv.clubName}
                meta={<StatusBadge value={inv.rolle} />}
                actions={
                  <>
                    <ActionForm action={acceptInvitation}>
                      <input type="hidden" name="token" value={inv.token} />
                      <Button type="submit" size="sm">
                        Annehmen
                      </Button>
                    </ActionForm>
                    <ActionForm action={declineInvitation}>
                      <input type="hidden" name="invitationId" value={inv.id} />
                      <Button type="submit" variant="secondary" size="sm">
                        Ablehnen
                      </Button>
                    </ActionForm>
                  </>
                }
              />
            ))}
          </List>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Meine Clubs</h2>
        {myClubs.length === 0 ? (
          <p className="text-[var(--color-muted)]">
            Du bist in keinem Club.{" "}
            <Link
              href="/clubs"
              className="text-[var(--color-accent)] underline"
            >
              Clubs ansehen
            </Link>
          </p>
        ) : (
          <List empty="Du bist in keinem Club.">
            {myClubs.map((c) => {
              // Der letzte Owner muss erst jemanden befördern — dieselbe Regel
              // wie in leaveClub; hier graut sie den Knopf aus.
              const sperre = rolleEntfernenGesperrt({
                scope: "club",
                rolle: c.rolle,
                ownerAnzahl: Number(c.ownerCount),
              });
              return (
                <ListRow
                  key={c.id}
                  title={c.name}
                  href={`/clubs/${c.id}`}
                  meta={<StatusBadge value={c.rolle} />}
                  actions={
                    <ActionForm action={leaveClub} className="flex items-center gap-1">
                      <input type="hidden" name="clubId" value={c.id} />
                      {sperre ? (
                        <span className="hidden text-xs text-[var(--color-faint)] sm:inline">
                          letzter Owner
                        </span>
                      ) : null}
                      <ConfirmButton
                        question={`${c.name} verlassen? Du verlierst den Zugriff auf die Club-Maschinen.`}
                        confirmLabel="Ja, verlassen"
                        disabled={sperre !== null}
                        aria-label={`${c.name} verlassen`}
                        title={sperre ?? "Club verlassen"}
                        className={`${ICON_BTN} hover:text-[var(--color-danger)]`}
                      >
                        <LogOut size={14} />
                      </ConfirmButton>
                    </ActionForm>
                  }
                />
              );
            })}
          </List>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">WhatsApp-Benachrichtigung</h2>
        <Card className="space-y-4">
          <p className="text-sm text-[var(--color-muted)]">
            Erhalte eine WhatsApp, sobald an einer Club-Maschine ein neuer Fehler
            gemeldet wird. Nummer hinterlegen und pro Club einschalten — nur für
            Clubs, die du als Owner/Admin verwaltest.
          </p>

          <WhatsappSettingsForm nummer={waStatus.nummer} />

          {managedClubs.length > 0 ? (
            <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
              <p className="text-xs font-medium text-[var(--color-muted)]">
                Pro Club
              </p>
              {!waStatus.nummer ? (
                <p className="text-xs text-[var(--color-faint)]">
                  Erst eine Nummer hinterlegen — dann lassen sich Clubs einschalten.
                </p>
              ) : null}
              {managedClubs.map((c) => (
                <WhatsappClubSchalter
                  key={c.id}
                  clubId={c.id}
                  name={c.name}
                  aktiv={aktiveClubs.has(c.id)}
                  nummerVorhanden={Boolean(waStatus.nummer)}
                />
              ))}
            </div>
          ) : (
            <p className="border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-faint)]">
              Die Benachrichtigung wird pro Club eingeschaltet — du verwaltest
              aktuell keinen Club als Owner/Admin.
            </p>
          )}
        </Card>
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
        <Card className="space-y-3">
          <p className="text-sm font-medium">Passwort ändern</p>
          <ChangePasswordForm />
        </Card>
        {/* Konto löschen: kein Aufklapper — ein roter Knopf, der den Dialog
            mit E-Mail-Bestätigung öffnet (KontoLoeschen). */}
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-muted)]">
            Konto und persönliche Daten unwiderruflich löschen.
          </p>
          <KontoLoeschen email={user.email} />
        </Card>
      </section>
    </div>
  );
}
