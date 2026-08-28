import Link from "next/link";
import { Check, Pencil, Repeat, Trash2 } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { List, ListRow } from "@/components/ui/list";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { deleteTermin, erledigeTermin } from "@/db/actions/termine";
import { tageDazwischen } from "@/lib/faelligkeit";

export type TerminEintrag = {
  id: string;
  titel: string;
  notiz: string | null;
  datum: Date;
  erinnerungTageVorher: number;
  wiederholenMonate: number | null;
};

/* Offene Termine eines Geräts (nächster zuerst) als List/ListRow — der Reiter-
   Kopf (＋ Neuer Termin) rendert die Seite. „Erledigt" rückt einen
   wiederkehrenden Termin weiter, sonst schließt es ihn. */
function faelligLabel(tage: number): { text: string; tone: BadgeTone } {
  if (tage < 0)
    return {
      text: `überfällig seit ${-tage} Tag${-tage === 1 ? "" : "en"}`,
      tone: "danger",
    };
  if (tage === 0) return { text: "heute fällig", tone: "warn" };
  return {
    text: `in ${tage} Tag${tage === 1 ? "" : "en"}`,
    tone: tage <= 14 ? "neutral" : "muted",
  };
}

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
        const f = faelligLabel(tageDazwischen(jetzt, t.datum));
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
                <Badge tone={f.tone}>{f.text}</Badge>
              </>
            }
            actions={
              schreibbar ? (
                <>
                  <form action={erledigeTermin}>
                    <input type="hidden" name="machineId" value={machineId} />
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
                    >
                      <Check size={14} /> Erledigt
                      {t.wiederholenMonate ? " (nächster)" : ""}
                    </button>
                  </form>
                  <Link
                    href={`/machines/${machineId}/termine/${t.id}/edit`}
                    className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                  >
                    <Pencil size={14} /> Bearbeiten
                  </Link>
                  <form action={deleteTermin}>
                    <input type="hidden" name="machineId" value={machineId} />
                    <input type="hidden" name="id" value={t.id} />
                    <ConfirmButton
                      question="Diesen Termin löschen?"
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
