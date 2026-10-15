import Link from "next/link";
import { Pencil, Trash2, Wrench } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ICON_BTN } from "@/components/ui/icon-button";
import { deleteFault } from "@/db/actions/faults";

/* Die Aktionen an EINEM Fehler — „Reparatur" als beschrifteter Knopf (die
   Hauptaktion), Stift und Papierkorb als Icons. Gleich in der Fehlerliste und
   in der „Offene Fehler"-Vorschau der Übersicht (Feedback Dirk 10/2026); nur
   rendern, wenn der Nutzer schreiben darf. */
export function FehlerZeilenAktionen({
  machineId,
  faultId,
}: {
  machineId: string;
  faultId: string;
}) {
  return (
    <>
      <ButtonLink
        href={`/machines/${machineId}/repairs/new?faultId=${faultId}`}
        variant="secondary"
        size="sm"
      >
        <Wrench size={14} /> Reparatur
      </ButtonLink>
      <Link
        href={`/machines/${machineId}/faults/${faultId}/edit`}
        aria-label="Fehler bearbeiten"
        title="Bearbeiten"
        className={ICON_BTN}
      >
        <Pencil size={14} />
      </Link>
      <ActionForm action={deleteFault}>
        <input type="hidden" name="machineId" value={machineId} />
        <input type="hidden" name="id" value={faultId} />
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
  );
}
