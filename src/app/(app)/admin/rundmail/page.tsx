import { EmailTemplateForm } from "@/components/email-template-form";
import { RundmailVersand } from "@/components/rundmail-form";
import { Card } from "@/components/ui/card";
import { getTemplate } from "@/db/queries";
import { renderPlatformInvitation } from "@/lib/email";
import { DEFAULT_TEMPLATES } from "@/lib/email-templates";
import { requireUser } from "@/lib/session";

/*
  Einladungs-Rundmail (Super-Admin; Guard im admin/layout.tsx). Drei Blöcke:
  den Einladungstext pflegen (dieselbe Vorlage wie unter E-Mail-Vorlagen),
  die Mail so sehen, wie sie ankommt (derselbe Renderer wie der Versand), und
  dann mehrere Adressen auf einmal einladen — jede mit eigenem Link. Der
  Versand passiert nur hier, per Knopf mit Rückfrage; nichts geht automatisch.
*/
export default async function RundmailPage() {
  const me = await requireUser();
  const vorlage = await getTemplate("invite_platform");
  const std = DEFAULT_TEMPLATES.invite_platform;
  const vorschau = await renderPlatformInvitation({
    url: "https://pinball-manager.silverballmania.com/register?invite=BEISPIEL",
    inviterName: me.name,
  });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Einladungs-Rundmail</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Hier schreibst du die Einladung, prüfst sie und verschickst sie an
          mehrere Personen auf einmal. Jede bekommt ihren eigenen
          Registrierungslink — der Text ist für alle derselbe. Der Text ist
          die Vorlage »Einladung zur Plattform« (auch unter E-Mail-Vorlagen):
          Klartext mit Absätzen; Web-Adressen werden in der Mail anklickbar.
          Der Knopf »Konto erstellen« und der Gültigkeitshinweis kommen
          automatisch darunter.
        </p>
        <EmailTemplateForm
          templateKey="invite_platform"
          label="1 · Text"
          beschreibung={std.beschreibung}
          platzhalter={std.platzhalter}
          subject={vorlage.subject}
          body={vorlage.body}
          angepasst={vorlage.angepasst}
          ctaLabel="Konto erstellen"
          hinweis=""
          rows={22}
          inlineVorschau={false}
        />
      </section>

      <section className="space-y-3">
        <Card className="space-y-3 bg-[var(--color-surface-2)]">
          <div>
            <p className="font-medium">2 · Vorschau</p>
            <p className="text-sm text-[var(--color-muted)]">
              So kommt die Mail an — mit der gespeicherten Fassung des Texts
              und einem Beispiel-Link. Nach dem Speichern aktualisiert sich die
              Vorschau.
            </p>
          </div>
          <p className="text-sm">
            <span className="text-[var(--color-muted)]">Betreff:</span>{" "}
            <span className="font-medium">{vorschau.subject}</span>
          </p>
          <iframe
            title="Vorschau der Einladungsmail"
            sandbox=""
            srcDoc={`<!doctype html><meta charset="utf-8"><body style="margin:16px;background:#fff;color:#111">${vorschau.html}</body>`}
            className="h-[560px] w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-white"
          />
        </Card>
      </section>

      <RundmailVersand eigeneAdresse={me.email} />
    </div>
  );
}
