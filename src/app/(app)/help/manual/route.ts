import { getCurrentUser, isSuperAdmin, kannKuratieren } from "@/lib/session";
import { ADMIN_HILFE, ANLEITUNG } from "@/lib/help-content";
import { erzeugeHandbuchPdf } from "@/lib/manual-pdf";
import { APP_VERSION } from "@/lib/version";

/*
  Handbuch-Download (/help/manual): baut das PDF bei jedem Abruf frisch aus dem
  Hilfe-Inhalt (lib/help-content.ts) — es kann also nie von der Hilfe abweichen.
  Nur angemeldet (401 statt Redirect: das hier ist ein Datei-Endpunkt, keine
  Seite). Kuratoren/Super-Admins bekommen zusätzlich die Admin-Kapitel — in der
  gleichen Filterung wie auf /help/admin.
*/
export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response("Nicht angemeldet", { status: 401 });

  const admin = kannKuratieren(user);
  const kapitel = admin
    ? [
        ...ANLEITUNG,
        ...ADMIN_HILFE.filter((s) => !s.nurSuperAdmin || isSuperAdmin(user)),
      ]
    : ANLEITUNG;

  const pdf = await erzeugeHandbuchPdf({
    kapitel,
    version: APP_VERSION,
    mitAdminKapiteln: admin,
  });

  return new Response(Buffer.from(pdf), {
    headers: {
      // Expliziter Content-Type ist Pflicht — global gilt X-Content-Type-Options: nosniff.
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="pinball-manager-handbuch.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
