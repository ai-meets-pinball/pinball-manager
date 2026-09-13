import { Copyright } from "lucide-react";

/*
  Der EINE Urheberrechts-Hinweis für alle Uploads und Importe (Fotos, Logos,
  Dokumente, Handbuch-PDF, JSON-Importe): Wer hochlädt, ist für die Rechte
  verantwortlich — besonders, wenn der Inhalt öffentlich freigegeben wird.
  Eine Quelle für den Wortlaut, damit er überall gleich lautet.
*/
export const URHEBER_HINWEIS =
  "Mit dem Hochladen bestätigst du, dass du die Rechte an den Inhalten hast oder sie nutzen darfst. Für Urheberrechte bist du selbst verantwortlich — besonders, wenn du Inhalte »öffentlich« freigibst.";

export function UrheberHinweis({ className = "" }: { className?: string }) {
  return (
    <p className={`flex items-start gap-1.5 text-xs text-[var(--color-muted)] ${className}`}>
      <Copyright size={13} className="mt-0.5 flex-none" />
      <span>{URHEBER_HINWEIS}</span>
    </p>
  );
}
