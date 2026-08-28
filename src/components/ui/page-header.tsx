import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

/*
  EIN Seitenkopf für alle Seiten: Titel (h1 an genau einem Ort statt ~30×
  kopiert), optionaler Untertitel, optionaler „← Zurück"-Link (behebt das
  Fehlen von Back-Links) und ein rechtsbündiger Aktions-Slot für die
  Primäraktion (z. B. „Neue Maschine" als ButtonLink). Bricht mobil sauber um.
*/
export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Zurück",
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-fg)]"
        >
          <ArrowLeft size={15} /> {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-balance">{title}</h1>
          {description ? (
            <p className="text-sm text-[var(--color-muted)]">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-none flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
