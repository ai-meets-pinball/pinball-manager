import { EmailTemplateForm } from "@/components/email-template-form";
import { getTemplate } from "@/db/queries";
import { DEFAULT_TEMPLATES, TEMPLATE_KEYS } from "@/lib/email-templates";

/* E-Mail-Vorlagen (Super-Admin). Guard sitzt im admin/layout.tsx. */

/* Fester Teil der Einladungsmails (nicht editierbar) — nur für die Vorschau. */
const FESTTEIL: Record<string, { ctaLabel: string; hinweis: string }> = {
  invite_platform: {
    ctaLabel: "Konto erstellen",
    hinweis:
      "Eine Registrierung ist nur über diesen Link möglich. Er ist begrenzt gültig und gilt ausschließlich für diese E-Mail-Adresse.",
  },
  invite_club: {
    ctaLabel: "Einladung ansehen",
    hinweis:
      "Hast du noch kein Konto, kannst du dich über den Link direkt registrieren. Der Link ist nur begrenzt gültig.",
  },
};

export default async function AdminVorlagenPage() {
  const vorlagen = await Promise.all(
    TEMPLATE_KEYS.map(async (key) => {
      const geladen = await getTemplate(key);
      return {
        key,
        ...DEFAULT_TEMPLATES[key],
        ...geladen,
        ...FESTTEIL[key],
      };
    }),
  );

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">E-Mail-Vorlagen</h2>
      <p className="text-sm text-[var(--color-muted)]">
        Betreff und Einleitungstext der Einladungsmails lassen sich hier anpassen.
        Der Button mit dem Einladungslink und der Gültigkeitshinweis bleiben
        bewusst fest — sonst könnte eine bearbeitete Vorlage den Link entfernen und
        Einladungen unbrauchbar machen.
      </p>
      <div className="space-y-3">
        {vorlagen.map((v) => (
          <EmailTemplateForm
            key={v.key}
            templateKey={v.key}
            label={v.label}
            beschreibung={v.beschreibung}
            platzhalter={v.platzhalter}
            subject={v.subject}
            body={v.body}
            angepasst={v.angepasst}
            ctaLabel={v.ctaLabel}
            hinweis={v.hinweis}
          />
        ))}
      </div>
    </section>
  );
}
