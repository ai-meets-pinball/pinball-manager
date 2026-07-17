import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/session";

/*
  Layout aller angemeldeten Bereiche. requireUser() ist hier die ECHTE Auth-Grenze
  (die Middleware ist nur ein optimistischer Cookie-Check). Nicht angemeldet → /login.
*/
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <Nav userName={user.name ?? user.email} role={user.role} />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
