import Link from "next/link";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Pencil, Trash2, Wrench } from "lucide-react";
import { List, ListRow } from "@/components/ui/list";
import { StatusBadge } from "@/components/ui/status-badge";
import { QuelleBadge } from "@/components/ui/quelle-badge";
import { RepairSuggestButton } from "@/components/repair-suggest-button";
import { deleteFault } from "@/db/actions/faults";
import type { AiProvider } from "@/lib/ai/provider";

type Fault = {
  id: string;
  beschreibung: string;
  kategorie: string | null;
  prioritaet: string;
  status: string;
  datum: Date;
  /** Meldeweg (faultSource); "sammel_qr" bekommt ein Kennzeichen. */
  quelle?: string | null;
  melderName?: string | null;
  /** Angehängte Fotos (URLs). */
  bilder?: string[];
};

/* Fehler eines Geräts als List/ListRow — der Reiter-Kopf (Filter + ＋ Neuer
   Fehler) rendert die Seite. Die Beschreibung ist der (umbrechende) Titel;
   Fotos und der KI-Reparaturvorschlag liegen im Vollbreiten-Slot darunter. */
export function FaultList({
  faults,
  machineId,
  schreibbar = true,
  kiProviders = [],
  kiCentralKey = false,
}: {
  faults: Fault[];
  machineId: string;
  /** false = nur Lesen: keine Bearbeiten-/Lösch-/Reparatur-Aktionen. */
  schreibbar?: boolean;
  /** Verfügbare KI-Anbieter (leer = keine → kein Vorschlags-Button). */
  kiProviders?: AiProvider[];
  /** Zentraler Anthropic-Key vorhanden? (sonst BYO-Feld im Vorschlag). */
  kiCentralKey?: boolean;
}) {
  return (
    <List empty="Keine Fehler erfasst.">
      {faults.map((fault) => (
        <ListRow
          key={fault.id}
          titleWrap
          title={fault.beschreibung}
          subtitle={`${fault.datum.toLocaleDateString("de-DE")}${
            fault.melderName ? ` · ${fault.melderName}` : ""
          }${fault.kategorie ? ` · ${fault.kategorie}` : ""}`}
          meta={
            <>
              <StatusBadge value={fault.status} />
              <StatusBadge value={fault.prioritaet} />
              <QuelleBadge quelle={fault.quelle} />
            </>
          }
          actions={
            schreibbar ? (
              <>
                <Link
                  href={`/machines/${machineId}/repairs/new?faultId=${fault.id}`}
                  className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
                >
                  <Wrench size={14} /> Reparatur
                </Link>
                <Link
                  href={`/machines/${machineId}/faults/${fault.id}/edit`}
                  className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                >
                  <Pencil size={14} /> Bearbeiten
                </Link>
                <form action={deleteFault}>
                  <input type="hidden" name="machineId" value={machineId} />
                  <input type="hidden" name="id" value={fault.id} />
                  <ConfirmButton
                    question="Diesen Fehler löschen?"
                    confirmLabel="Ja, löschen"
                    className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 size={14} /> Löschen
                  </ConfirmButton>
                </form>
              </>
            ) : null
          }
        >
          {fault.bilder && fault.bilder.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {fault.bilder.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block h-20 w-20 overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Foto zum Fehler"
                    className="h-full w-full object-cover"
                  />
                </a>
              ))}
            </div>
          ) : null}

          {schreibbar && kiProviders.length > 0 ? (
            <RepairSuggestButton
              machineId={machineId}
              fault={{
                id: fault.id,
                beschreibung: fault.beschreibung,
                status: fault.status,
              }}
              providers={kiProviders}
              centralKey={kiCentralKey}
            />
          ) : null}
        </ListRow>
      ))}
    </List>
  );
}
