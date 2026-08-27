import Link from "next/link";
import {
  Download,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { deleteDokument } from "@/db/actions/dokumente";

export type DokumentEintrag = {
  id: string;
  typ: string; // 'link' | 'notiz' | 'datei'
  titel: string;
  notiz: string | null;
  url: string | null;
  dateiname: string | null;
  createdAt: Date;
};

const ICON = {
  link: LinkIcon,
  notiz: StickyNote,
  datei: FileText,
} as const;

/** Host einer URL für die kompakte Anzeige (fällt bei Unfug auf die rohe URL). */
function hostVon(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/* Dokumente eines Geräts (Links / Notizen / Dateien) — Server-Komponente
   (Formulare = Server-Actions). Vorbild TerminListe. Add/Bearbeiten/Löschen nur
   für Schreibberechtigte; Links öffnen extern, Dateien werden heruntergeladen. */
export function DokumenteListe({
  dokumente,
  machineId,
  schreibbar = true,
}: {
  dokumente: DokumentEintrag[];
  machineId: string;
  schreibbar?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Dokumente</h3>
        {schreibbar ? (
          <Link
            href={`/machines/${machineId}/dokumente/new`}
            className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
          >
            <Plus size={15} /> Hinzufügen
          </Link>
        ) : null}
      </div>

      {dokumente.length === 0 ? (
        <p className="text-[var(--color-muted)]">
          Noch keine Dokumente. Lege Links, Notizen oder Dateien (PDF, Bilder,
          Office) zu diesem Gerät ab.
        </p>
      ) : (
        dokumente.map((d) => {
          const Icon = ICON[d.typ as keyof typeof ICON] ?? FileText;
          return (
            <Card key={d.id} className="space-y-2">
              <div className="flex items-start gap-2">
                <Icon
                  size={16}
                  className="mt-0.5 shrink-0 text-[var(--color-muted)]"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  {d.typ === "link" && d.url ? (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)] hover:underline"
                    >
                      {d.titel} <ExternalLink size={13} />
                    </a>
                  ) : (
                    <span className="font-medium">{d.titel}</span>
                  )}

                  {d.typ === "link" && d.url ? (
                    <p className="truncate text-xs text-[var(--color-muted)]">
                      {hostVon(d.url)}
                    </p>
                  ) : null}

                  {d.typ === "datei" && d.url ? (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={d.dateiname ?? undefined}
                      className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
                    >
                      <Download size={13} /> {d.dateiname ?? "Datei öffnen"}
                    </a>
                  ) : null}

                  {d.notiz ? (
                    <p className="whitespace-pre-wrap text-sm text-[var(--color-muted)]">
                      {d.notiz}
                    </p>
                  ) : null}
                </div>
              </div>

              {schreibbar ? (
                <div className="flex flex-wrap gap-3 text-sm">
                  <Link
                    href={`/machines/${machineId}/dokumente/${d.id}/edit`}
                    className="inline-flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                  >
                    <Pencil size={14} /> Bearbeiten
                  </Link>
                  <form action={deleteDokument}>
                    <input type="hidden" name="machineId" value={machineId} />
                    <input type="hidden" name="id" value={d.id} />
                    <ConfirmButton
                      question={
                        d.typ === "datei"
                          ? "Dieses Dokument samt Datei löschen?"
                          : "Diesen Eintrag löschen?"
                      }
                      confirmLabel="Ja, löschen"
                      className="inline-flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                    >
                      <Trash2 size={14} /> Löschen
                    </ConfirmButton>
                  </form>
                </div>
              ) : null}
            </Card>
          );
        })
      )}
    </div>
  );
}
