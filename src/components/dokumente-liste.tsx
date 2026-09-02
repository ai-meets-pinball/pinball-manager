import Link from "next/link";
import {
  Download,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Pencil,
  StickyNote,
  Trash2,
} from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ICON_BTN } from "@/components/ui/icon-button";
import { List, ListRow } from "@/components/ui/list";
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

/* Dokumente eines Geräts (Links / Notizen / Dateien) als List/ListRow — der
   Reiter-Kopf (＋ Neues Dokument) rendert die Seite. Links öffnen extern,
   Dateien werden heruntergeladen; rechts Stift und Papierkorb als Icons. */
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
    <List empty="Noch keine Dokumente. Lege Links, Notizen oder Dateien (PDF, Bilder, Office) zu diesem Gerät ab.">
      {dokumente.map((d) => {
        const Icon = ICON[d.typ as keyof typeof ICON] ?? FileText;
        return (
          <ListRow
            key={d.id}
            leading={
              <Icon size={16} className="mt-0.5 text-[var(--color-muted)]" />
            }
            title={
              d.typ === "link" && d.url ? (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
                >
                  {d.titel} <ExternalLink size={13} />
                </a>
              ) : (
                d.titel
              )
            }
            subtitle={
              d.typ === "link" && d.url ? hostVon(d.url) : undefined
            }
            actions={
              schreibbar ? (
                <>
                  <Link
                    href={`/machines/${machineId}/dokumente/${d.id}/edit`}
                    aria-label="Dokument bearbeiten"
                    title="Bearbeiten"
                    className={ICON_BTN}
                  >
                    <Pencil size={14} />
                  </Link>
                  <ActionForm action={deleteDokument}>
                    <input type="hidden" name="machineId" value={machineId} />
                    <input type="hidden" name="id" value={d.id} />
                    <ConfirmButton
                      question={
                        d.typ === "datei"
                          ? "Dieses Dokument löschen? Die Datei wird dabei endgültig aus dem Speicher entfernt."
                          : "Diesen Eintrag löschen?"
                      }
                      confirmLabel="Ja, löschen"
                      aria-label="Dokument löschen"
                      title="Löschen"
                      className={`${ICON_BTN} hover:text-[var(--color-danger)]`}
                    >
                      <Trash2 size={14} />
                    </ConfirmButton>
                  </ActionForm>
                </>
              ) : null
            }
          >
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
          </ListRow>
        );
      })}
    </List>
  );
}
