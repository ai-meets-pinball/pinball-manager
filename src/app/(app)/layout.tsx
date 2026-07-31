import { eq } from "drizzle-orm";
import { Nav } from "@/components/nav";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { initialen } from "@/lib/format";
import { isSuperAdmin, requireUser } from "@/lib/session";

/*
  Layout aller angemeldeten Bereiche. requireUser() ist hier die ECHTE Auth-Grenze
  (die Middleware ist nur ein optimistischer Cookie-Check). Nicht angemeldet → /login.
  Für den Avatar in der Kopfzeile wird das Profil (Bild/Initialen) mitgeladen.
*/
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
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
      />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
