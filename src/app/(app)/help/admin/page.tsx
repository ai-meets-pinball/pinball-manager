import { redirect } from "next/navigation";
import {
  HandbuchDownload,
  HilfeInhalt,
  HilfeSektionen,
} from "@/components/help-sections";
import { HelpTabs } from "@/components/help-tabs";
import { ADMIN_HILFE } from "@/lib/help-content";
import { isSuperAdmin, kannKuratieren, requireUser } from "@/lib/session";

/*
  Admin-Hilfe — Verwaltung und Moderation. Zugang für Kuratoren UND Super-
  Admins; ein Nur-Kurator sieht dabei nur die Sektionen ohne `nurSuperAdmin`
  (praktisch: die Kuratierung). Inhalt aus lib/help-content.ts (ADMIN_HILFE),
  Darstellung wie die Anleitung (components/help-sections.tsx).
*/
export default async function AdminHelpPage() {
  const user = await requireUser();
  if (!kannKuratieren(user)) redirect("/help");

  const sichtbar = ADMIN_HILFE.filter(
    (s) => !s.nurSuperAdmin || isSuperAdmin(user),
  );

  return (
    <div className="space-y-8">
      <HelpTabs
        active="admin"
        istSuperAdmin={isSuperAdmin(user)}
        darfKuratieren
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Administration &amp; Kuratierung</h1>
          <p className="text-[var(--color-muted)]">
            Die Hilfe für Verwaltungs- und Moderations-Aufgaben — von Nutzern,
            Rollen und Einladungen über die Kataloge bis zur Kuratierung der
            Wissensbasis.
          </p>
        </div>
        <HandbuchDownload />
      </div>

      <HilfeInhalt sektionen={sichtbar} />
      <HilfeSektionen sektionen={sichtbar} />
    </div>
  );
}
