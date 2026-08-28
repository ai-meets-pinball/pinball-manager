import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { isSuperAdmin, requireUser } from "@/lib/session";

/*
  Super-Admin-Bereich. Der Cookie-Check in proxy.ts ist nur optimistisch — die
  echte Grenze ist requireUser + isSuperAdmin HIER. Der Guard im Layout deckt ALLE
  /admin/*-Seiten ab (Nutzer, Clubs, Vorlagen, Modelle, Debug-Sichtbarkeit),
  daher brauchen die einzelnen Seiten keine eigene Prüfung mehr.
*/
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const me = await requireUser();
  if (!isSuperAdmin(me)) redirect("/machines");

  return (
    <div className="space-y-6">
      <PageHeader title="Administration" />
      <AdminNav />
      {children}
    </div>
  );
}
