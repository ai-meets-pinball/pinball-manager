import Link from "next/link";
import { Check, Pencil, Repeat, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ICON_BTN } from "@/components/ui/icon-button";
import { List, ListRow } from "@/components/ui/list";
import { deleteTermin, erledigeTermin } from "@/db/actions/termine";
import { faelligLabel, tageDazwischen } from "@/lib/faelligkeit";

export type TerminEintrag = {
  id: string;
  titel: string;
  notiz: string | null;
  datum: Date;
  erinnerungTageVorher: number;
  wiederholenMonate: number | null;
};

/* Offene Termine eines Geräts (nächster zuerst) als List/ListRow — der Reiter-
   Kopf (＋ Neuer Termin) rendert die Seite. Rechts die Zeilen-Aktionen:
   „Erledigt" als beschrifteter Knopf (rückt einen wiederkehrenden Termin
   weiter, sonst schließt es ihn), Stift und Papierkorb als Icons. Das
   Fälligkeits-Label kommt aus derselben Regel wie bei der Wartung. */
export function TerminListe({
  termine,
  machineId,
  schreibbar = true,
}: {
  termine: TerminEintrag[];
  machineId: string;
  schreibbar?: boolean;
}) {
  const jetzt = new Date();

  return (
    <List empty="Keine anstehenden Termine.">
      {termine.map((t) => {
        const tage = tageDazwischen(jetzt, t.datum);
        const f = faelligLabel(
          tage <= 0 ? "faellig" : tage <= 14 ? "bald" : "ok",
          tage,
        );
        return (
          <ListRow
            key={t.id}
            title={t.titel}
            subtitle={t.datum.toLocaleDateString("de-DE")}
            meta={
              <>
                {t.wiederholenMonate ? (
                  <Badge tone="neutral">
                    <Repeat size={11} /> alle {t.wiederholenMonate} Monate
                  </Badge>
                ) : null}
                <Badge tone={f.ton}>{f.text}</Badge>
              </>
            }
            actions={
              schreibbar ? (
                <>
                  <form action={erledigeTermin}>
                    <input type="hidden" name="machineId" value={machineId} />
                    <input type="hidden" name="id" value={t.id} />
                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      title={
                        t.wiederholenMonate
                          ? "Rückt den Termin um das Intervall weiter"
                          : "Schließt den Termin"
                      }
                    >
                      <Check size={14} /> Erledigt
                    </Button>
                  </form>
                  <Link
                    href={`/machines/${machineId}/termine/${t.id}/edit`}
                    aria-label="Termin bearbeiten"
                    title="Bearbeiten"
                    className={ICON_BTN}
                  >
                    <Pencil size={14} />
                  </Link>
                  <ActionForm action={deleteTermin}>
                    <input type="hidden" name="machineId" value={machineId} />
                    <input type="hidden" name="id" value={t.id} />
                    <ConfirmButton
                      question={
                        t.wiederholenMonate
                          ? "Diesen Termin samt allen Wiederholungen löschen? Es gibt dann keine Erinnerung mehr."
                          : "Diesen Termin löschen? Es gibt dann keine Erinnerung mehr."
                      }
                      confirmLabel="Ja, löschen"
                      aria-label="Termin löschen"
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
            {t.notiz ? (
              <p className="whitespace-pre-wrap text-sm text-[var(--color-muted)]">
                {t.notiz}
              </p>
            ) : null}
          </ListRow>
        );
      })}
    </List>
  );
}
