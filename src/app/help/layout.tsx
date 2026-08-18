import { eq } from "drizzle-orm";
import { Nav } from "@/components/nav";
import { MarketingFooter, MarketingNav } from "@/components/site-chrome";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { initialen } from "@/lib/format";
import { getCurrentUser, isSuperAdmin, kannKuratieren } from "@/lib/session";

/*
  Hilfe-Layout. Die Anleitung (/help) ist ÖFFENTLICH — hier steht bewusst KEIN
  requireUser(). Die Unterseiten /help/admin, /help/techstack und /help/setup
  bringen ihre eigenen Rollen-Guards mit (requireUser + Rollen-Redirect), die
  bleiben also gated.

  Die Kopfzeile passt sich an: Eingeloggte behalten ihre gewohnte App-Navigation,
  Gäste sehen die öffentliche Marketing-Leiste (mit Anmelden-Button).
*/
export default async function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="min-h-screen">
        <MarketingNav />
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        <MarketingFooter />
      </div>
    );
  }

  const profil = await db.query.user.findFirst({
    where: eq(userTable.id, user.id),
    columns: { image: true, firstName: true, lastName: true, initials: true },
  });

  return (
    <div className="min-h-screen">
      <Nav
        userName={user.name ?? user.email}
        avatar={profil?.image ?? null}
        kuerzel={initialen({ ...profil, name: user.name, email: user.email })}
        isSuperAdmin={isSuperAdmin(user)}
        istKurator={kannKuratieren(user)}
      />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
