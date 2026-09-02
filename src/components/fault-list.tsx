import Link from "next/link";
import { Pencil, Trash2, Wrench } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ICON_BTN } from "@/components/ui/icon-button";
import { List, ListRow } from "@/components/ui/list";
import { StatusBadge } from "@/components/ui/status-badge";
import { QuelleBadge } from "@/components/ui/quelle-badge";
import { deleteFault } from "@/db/actions/faults";

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
   Fehler) rendert die Seite. Die Beschreibung ist der (umbrechende) Titel,
   Fotos liegen im Vollbreiten-Slot darunter. Rechts die Zeilen-Aktionen:
   „Reparatur" als beschrifteter Knopf (die Hauptaktion am Fehler), Stift und
   Papierkorb als Icons. Der KI-Reparaturvorschlag lebt nicht mehr hier,
   sondern auf der Seite „Neue Reparatur" — dort gehört das Formular hin. */
export function FaultList({
  faults,
  machineId,
  schreibbar = true,
}: {
  faults: Fault[];
  machineId: string;
  /** false = nur Lesen: keine Bearbeiten-/Lösch-/Reparatur-Aktionen. */
  schreibbar?: boolean;
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
                <ButtonLink
                  href={`/machines/${machineId}/repairs/new?faultId=${fault.id}`}
                  variant="secondary"
                  size="sm"
                >
                  <Wrench size={14} /> Reparatur
                </ButtonLink>
                <Link
                  href={`/machines/${machineId}/faults/${fault.id}/edit`}
                  aria-label="Fehler bearbeiten"
                  title="Bearbeiten"
                  className={ICON_BTN}
                >
                  <Pencil size={14} />
                </Link>
                <ActionForm action={deleteFault}>
                  <input type="hidden" name="machineId" value={machineId} />
                  <input type="hidden" name="id" value={fault.id} />
                  <ConfirmButton
                    question="Diesen Fehler löschen? Verknüpfte Reparaturen bleiben erhalten, verweisen aber nicht mehr auf ihn."
                    confirmLabel="Ja, löschen"
                    aria-label="Fehler löschen"
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
        </ListRow>
      ))}
    </List>
  );
}
